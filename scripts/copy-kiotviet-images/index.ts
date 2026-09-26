/**
 * Chép một lần ảnh mã hàng từ file export KiotViet sang Drive (D-11..D-14, D-22, ANH-06).
 *
 *   npm run import:kiotviet-images                       # = --dry-run: đọc, đối chiếu, báo cáo, không ghi gì
 *   npm run import:kiotviet-images -- --ghi --gioi-han 20  # chép thử 20 ảnh
 *   npm run import:kiotviet-images -- --ghi                # chép toàn bộ, chạy lại được
 *
 * MẶC ĐỊNH AN TOÀN: không có --ghi thì chỉ đọc, đối chiếu, báo cáo — không gọi
 * mạng tới KiotViet/Apps Script, không ghi database. Chạy lại được: ảnh đã chép
 * (kể cả đã bị xóa mềm) bị bỏ qua nhờ `nguon_url` (D-13).
 */
import { readdirSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { docSheet, readString } from "../import-kiotviet/read-file";
import { taoAdminClient } from "../_supabase-admin";
import {
  parseImageCell,
  buildCopyPlan,
  type SourceRow,
  type CopyJob,
} from "./parse-image-cell";
import { GDriveImageStorage } from "../../src/features/images/lib/storage/gdrive-storage.server";
import { ImageStorageError } from "../../src/features/images/lib/storage/image-storage";
import {
  FULL_MAX_EDGE,
  THUMB_MAX_EDGE,
  FULL_QUALITY,
  THUMB_QUALITY,
  FALLBACK_QUALITY,
  MAX_FULL_BYTES,
  MAX_THUMB_BYTES,
  safeFileStem,
} from "../../src/features/images/lib/image-rules";

type SharpFn = (typeof import("sharp"))["default"];

const CO = new Set(process.argv.slice(2));
const GHI = CO.has("--ghi");

function docSoCo(co: string): number | null {
  const idx = process.argv.indexOf(co);
  if (idx === -1) return null;
  const n = Number(process.argv[idx + 1]);
  return Number.isFinite(n) ? n : null;
}

const GIOI_HAN = docSoCo("--gioi-han");
const SONG_SONG = Math.min(5, Math.max(1, docSoCo("--song-song") ?? 3));

const THU_MUC = path.join("data", "kiotviet");
const TIEN_TO_SAN_PHAM = "DanhSachSanPham";

function duongDanSanPham(): string {
  let ungVien: string[] = [];
  try {
    ungVien = readdirSync(THU_MUC)
      .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"))
      .filter((f) =>
        f.toLowerCase().startsWith(TIEN_TO_SAN_PHAM.toLowerCase()),
      );
  } catch {
    throw new Error(
      `Không tìm thấy thư mục ${THU_MUC}.\nCách xử lý: đặt file export ${TIEN_TO_SAN_PHAM}*.xlsx vào data/kiotviet/.`,
    );
  }
  if (ungVien.length === 0) {
    throw new Error(
      `Không tìm thấy file ${TIEN_TO_SAN_PHAM}*.xlsx trong ${THU_MUC}.\nXem data/kiotviet/README.md.`,
    );
  }
  ungVien.sort(
    (a, b) =>
      statSync(path.join(THU_MUC, b)).mtimeMs -
      statSync(path.join(THU_MUC, a)).mtimeMs,
  );
  if (ungVien.length > 1) {
    console.warn(
      `  ⚠ Có ${ungVien.length} file khớp "${TIEN_TO_SAN_PHAM}". Dùng bản mới nhất: ${ungVien[0]}`,
    );
  }
  return path.join(THU_MUC, ungVien[0]!);
}

async function docSanPham(): Promise<{ file: string; rows: SourceRow[] }> {
  const file = duongDanSanPham();
  const raw = await docSheet(file);
  const rows: SourceRow[] = raw
    .map((d) => ({
      code: readString(d.cells["ma_hang"]) ?? "",
      urls: parseImageCell(readString(d.cells["hinh_anh_url1_url2"])),
    }))
    .filter((r) => r.code !== "");
  return { file, rows };
}

type AdminClient = ReturnType<typeof taoAdminClient>;

const TRANG = 1000;

async function docTatCaSanPham(db: AdminClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("san_pham")
      .select("id, ma_hang")
      .range(from, from + TRANG - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) map.set(row.ma_hang.trim().toUpperCase(), row.id);
    if (data.length < TRANG) break;
    from += TRANG;
  }
  return map;
}

/** Gồm cả ảnh đã xóa mềm (service_role bỏ qua RLS) — không chép lại ảnh người dùng đã xóa. */
async function docTatCaAnhDaChep(db: AdminClient): Promise<Set<string>> {
  const existing = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("hinh_anh")
      .select("san_pham_id, nguon_url")
      .not("nguon_url", "is", null)
      .range(from, from + TRANG - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.nguon_url) existing.add(`${row.san_pham_id}|${row.nguon_url}`);
    }
    if (data.length < TRANG) break;
    from += TRANG;
  }
  return existing;
}

function inDongKeChia(n: number): string {
  return n.toLocaleString("vi-VN");
}

type LinkHong = { code: string; url: string; lyDo: string };
type LoiKhac = { code: string; url: string; lyDo: string };

/** Lỗi 4xx (link chết, không phải lỗi mạng tạm thời) — không thử lại. */
class LinkKhongDoc extends Error {}

async function taiVeCoThuLai(url: string): Promise<Buffer> {
  let lanCuoi: unknown;
  const cho = [0, 1000, 3000];
  for (let lan = 0; lan < cho.length; lan++) {
    if (cho[lan]! > 0) await new Promise((r) => setTimeout(r, cho[lan]));
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (res.status >= 400 && res.status < 500) {
        throw new LinkKhongDoc(`HTTP ${res.status}`);
      }
      if (!res.ok) {
        lanCuoi = new Error(`HTTP ${res.status}`);
        continue;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (e instanceof LinkKhongDoc) throw e;
      lanCuoi = e;
    }
  }
  throw lanCuoi instanceof Error
    ? lanCuoi
    : new Error("Không tải được ảnh sau 3 lần thử");
}

async function nenAnh(
  sharp: SharpFn,
  buf: Buffer,
  maxEdge: number,
  quality: number,
  maxBytes: number,
): Promise<Buffer> {
  let out = await sharp(buf)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: Math.round(quality * 100) })
    .toBuffer();
  if (out.byteLength > maxBytes) {
    out = await sharp(buf)
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: Math.round(FALLBACK_QUALITY * 100) })
      .toBuffer();
  }
  return out;
}

async function xuLyMotAnh(
  job: CopyJob,
  ctx: {
    db: AdminClient;
    storage: GDriveImageStorage;
    sharp: SharpFn;
    brokenLinks: LinkHong[];
    errors: LoiKhac[];
  },
): Promise<{ ok: boolean; skippedDuplicate: boolean }> {
  let buf: Buffer;
  try {
    buf = await taiVeCoThuLai(job.url);
  } catch (e) {
    ctx.brokenLinks.push({
      code: job.productCode,
      url: job.url,
      lyDo: xuatLoi(e),
    });
    return { ok: false, skippedDuplicate: false };
  }

  let full: Buffer;
  let thumb: Buffer;
  try {
    full = await nenAnh(
      ctx.sharp,
      buf,
      FULL_MAX_EDGE,
      FULL_QUALITY,
      MAX_FULL_BYTES,
    );
    thumb = await nenAnh(
      ctx.sharp,
      buf,
      THUMB_MAX_EDGE,
      THUMB_QUALITY,
      MAX_THUMB_BYTES,
    );
  } catch {
    ctx.brokenLinks.push({
      code: job.productCode,
      url: job.url,
      lyDo: "không phải ảnh đọc được",
    });
    return { ok: false, skippedDuplicate: false };
  }
  if (full.byteLength > MAX_FULL_BYTES || thumb.byteLength > MAX_THUMB_BYTES) {
    ctx.errors.push({
      code: job.productCode,
      url: job.url,
      lyDo: "nén xong vẫn vượt dung lượng cho phép",
    });
    return { ok: false, skippedDuplicate: false };
  }

  const id = randomUUID();
  const fileName = `${safeFileStem(job.productCode)}__${id}.webp`;

  let key: string;
  try {
    key = await luuVoiThuLai(ctx.storage, "full", fileName, full);
  } catch (e) {
    ctx.errors.push({ code: job.productCode, url: job.url, lyDo: xuatLoi(e) });
    return { ok: false, skippedDuplicate: false };
  }

  let thumbKey: string;
  try {
    thumbKey = await luuVoiThuLai(ctx.storage, "thumb", fileName, thumb);
  } catch (e) {
    await ctx.storage.remove(key).catch(() => undefined);
    ctx.errors.push({ code: job.productCode, url: job.url, lyDo: xuatLoi(e) });
    return { ok: false, skippedDuplicate: false };
  }

  const { error } = await ctx.db.rpc("nap_anh_kiotviet", {
    p_id: id,
    p_san_pham_id: job.productId,
    p_noi_luu: ctx.storage.backend,
    p_khoa_luu: key,
    p_khoa_luu_thumb: thumbKey,
    p_nguon_url: job.url,
  });

  if (error) {
    await ctx.storage.remove(key).catch(() => undefined);
    await ctx.storage.remove(thumbKey).catch(() => undefined);
    if (error.code === "23505") {
      return { ok: true, skippedDuplicate: true };
    }
    ctx.errors.push({
      code: job.productCode,
      url: job.url,
      lyDo: error.message,
    });
    return { ok: false, skippedDuplicate: false };
  }

  return { ok: true, skippedDuplicate: false };
}

function xuatLoi(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Dừng toàn bộ khi Apps Script từ chối secret — không có cách tự phục hồi. */
class DungToanBo extends Error {}

async function luuVoiThuLai(
  storage: GDriveImageStorage,
  variant: "full" | "thumb",
  fileName: string,
  bytes: Buffer,
): Promise<string> {
  const cho = [0, 1000, 3000];
  let lanCuoi: unknown;
  for (let lan = 0; lan < cho.length; lan++) {
    if (cho[lan]! > 0) await new Promise((r) => setTimeout(r, cho[lan]));
    try {
      return await storage.put({
        variant,
        fileName,
        bytes: new Uint8Array(bytes),
      });
    } catch (e) {
      if (e instanceof ImageStorageError && e.kind === "forbidden") {
        throw new DungToanBo(
          "Secret Apps Script sai — kiểm APPS_SCRIPT_SECRET",
        );
      }
      lanCuoi = e;
      if (!(e instanceof ImageStorageError && e.kind === "unavailable"))
        throw e;
    }
  }
  throw lanCuoi instanceof Error
    ? lanCuoi
    : new Error("Không lưu được ảnh sau nhiều lần thử");
}

async function xuLyMotMa(
  jobs: CopyJob[],
  ctx: {
    db: AdminClient;
    storage: GDriveImageStorage;
    sharp: SharpFn;
    brokenLinks: LinkHong[];
    errors: LoiKhac[];
  },
  tienDo: { daXong: number; tong: number },
): Promise<{ daChep: number; boQuaTrung: number }> {
  const daySapXep = [...jobs].sort((a, b) => a.order - b.order);
  let daChep = 0;
  let boQuaTrung = 0;
  for (const job of daySapXep) {
    const kq = await xuLyMotAnh(job, ctx);
    if (kq.ok && kq.skippedDuplicate) boQuaTrung += 1;
    else if (kq.ok) daChep += 1;
    tienDo.daXong += 1;
    if (tienDo.daXong % 20 === 0) {
      console.log(`  đã chép ${tienDo.daXong} / ${tienDo.tong}`);
    }
  }
  return { daChep, boQuaTrung };
}

async function chayThat(jobs: CopyJob[], db: AdminClient): Promise<void> {
  let sharpMod: SharpFn;
  try {
    sharpMod = (await import("sharp")).default;
  } catch {
    console.error("\nChưa cài sharp. Chạy: npm install\n");
    process.exit(1);
  }

  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) {
    console.error(
      "\nThiếu APPS_SCRIPT_URL hoặc APPS_SCRIPT_SECRET trong .env.local.\n" +
        "Làm theo apps-script/README.md mục 8 rồi chạy lại.\n",
    );
    process.exit(1);
  }
  const storage = new GDriveImageStorage({ url, secret });

  // jobs đã bị cắt theo --gioi-han ở main() — không cắt lại ở đây.
  const theoMa = new Map<string, CopyJob[]>();
  for (const job of jobs) {
    const dsach = theoMa.get(job.productId) ?? [];
    dsach.push(job);
    theoMa.set(job.productId, dsach);
  }

  const brokenLinks: LinkHong[] = [];
  const errors: LoiKhac[] = [];
  const tienDo = { daXong: 0, tong: jobs.length };
  let tongDaChep = 0;
  let tongBoQuaTrung = 0;
  let dungSom: string | null = null;

  const dsMa = [...theoMa.entries()];
  let viTri = 0;

  async function chayMotLuong(): Promise<void> {
    for (;;) {
      const idx = viTri;
      viTri += 1;
      if (idx >= dsMa.length) return;
      const [, dsJobs] = dsMa[idx]!;
      try {
        const kq = await xuLyMotMa(
          dsJobs,
          { db, storage, sharp: sharpMod, brokenLinks, errors },
          tienDo,
        );
        tongDaChep += kq.daChep;
        tongBoQuaTrung += kq.boQuaTrung;
      } catch (e) {
        if (e instanceof DungToanBo) {
          dungSom = e.message;
          return;
        }
        errors.push({
          code: dsJobs[0]?.productCode ?? "?",
          url: dsJobs[0]?.url ?? "",
          lyDo: xuatLoi(e),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: SONG_SONG }, () => chayMotLuong()));

  console.log("\n" + "─".repeat(70));
  console.log(`Đã chép:        ${inDongKeChia(tongDaChep)} ảnh`);
  console.log(`Bỏ qua (trùng):  ${inDongKeChia(tongBoQuaTrung)} ảnh`);

  if (brokenLinks.length) {
    console.log(`\nLink hỏng (${brokenLinks.length}):`);
    for (const b of brokenLinks)
      console.log(`  ${b.code}  ${b.url}  — ${b.lyDo}`);
  }
  if (errors.length) {
    console.log(`\nLỗi khác (${errors.length}):`);
    for (const e of errors) console.log(`  ${e.code}  ${e.url}  — ${e.lyDo}`);
  }

  if (dungSom) {
    console.error(`\nDỪNG SỚM: ${dungSom}\n`);
    process.exit(1);
  }

  if (errors.length > 0) {
    console.log("\nCó lỗi khác ngoài link hỏng — xem danh sách phía trên.\n");
    process.exit(1);
  }

  // --gioi-han chỉ chép một lô, nên chạy lại sẽ còn ảnh — không hứa "đã chép hết"
  console.log(
    GIOI_HAN === null
      ? "\nXong. Chạy lại lệnh này lần nữa sẽ báo 0 ảnh mới (đã chép hết).\n"
      : "\nXong lô này. Chạy dry-run (bỏ --ghi) để xem còn bao nhiêu ảnh chưa chép.\n",
  );
}

async function main() {
  console.log("═══ CHÉP ẢNH MÃ HÀNG TỪ KIOTVIET SANG DRIVE ═══");
  console.log(
    `Chế độ:  ${GHI ? "GHI THẬT" : "THỬ (không ghi database, không gọi Apps Script)"}`,
  );

  const { file, rows } = await docSanPham();
  console.log(`File:    ${path.basename(file)}`);

  const db = taoAdminClient();
  const [productIdByCode, existing] = await Promise.all([
    docTatCaSanPham(db),
    docTatCaAnhDaChep(db),
  ]);

  const plan = buildCopyPlan(rows, productIdByCode, existing);
  const jobs =
    GIOI_HAN !== null && GIOI_HAN >= 0
      ? plan.jobs.slice(0, GIOI_HAN)
      : plan.jobs;

  console.log("\n" + "─".repeat(70));
  console.log(
    `Mã có ảnh trong file:     ${inDongKeChia(plan.productsWithImages)}`,
  );
  console.log(`Tổng số ảnh trong file:   ${inDongKeChia(plan.totalImages)}`);
  console.log(`Đã chép từ trước:         ${inDongKeChia(plan.alreadyCopied)}`);
  console.log(`Sẽ chép lần này:          ${inDongKeChia(jobs.length)}`);
  if (plan.unknownCodes.length) {
    console.log(`\nMã không khớp danh mục (${plan.unknownCodes.length}):`);
    for (const c of plan.unknownCodes.slice(0, 50)) console.log(`  ${c}`);
    if (plan.unknownCodes.length > 50)
      console.log(`  ... và ${plan.unknownCodes.length - 50} mã nữa`);
  }

  if (!GHI) {
    console.log("\nChạy lại với --ghi để chép thật.\n");
    return;
  }

  console.log(`\nĐang chép (song song ${SONG_SONG} mã)...`);
  await chayThat(jobs, db);
}

main().catch((e) => {
  console.error(
    "\nimport:kiotviet-images thất bại:\n",
    e instanceof Error ? e.message : e,
    "\n",
  );
  process.exit(1);
});
