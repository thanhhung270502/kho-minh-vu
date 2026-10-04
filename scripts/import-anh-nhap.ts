/**
 * Nạp ảnh mã hàng văn phòng đặt tên theo quy tắc "<mã hàng>_<số thứ tự>.jpg|png"
 * (thư mục Drive "Kho Minh Vu - Anh/anh-nhap", tải về máy).
 *
 *   npx tsx --env-file=.env.local scripts/import-anh-nhap.ts [thư-mục]                   # = kiểm tra, không ghi
 *   npx tsx --env-file=.env.local scripts/import-anh-nhap.ts [thư-mục] --ghi --gioi-han 20 # nạp thử 20 ảnh
 *   npx tsx --env-file=.env.local scripts/import-anh-nhap.ts [thư-mục] --ghi               # nạp toàn bộ
 *   npx tsx --env-file=.env.local scripts/import-anh-nhap.ts --drive [--ghi]               # đọc thẳng Drive
 *
 * Nguồn ảnh: thư mục trên máy (mặc định data/anh-nhap, gitignore, quét cả thư mục
 * con — zip Drive tải về thường lồng thêm một tầng), hoặc --drive: liệt kê thư mục
 * "anh-nhap" và tải từng ảnh qua Apps Script (action list/get), khỏi tải zip.
 *
 * Mỗi ảnh nén WebP bản gốc + thumb (cùng quy tắc app), lưu qua Apps Script, rồi
 * gắn vào mã qua RPC nap_anh_kiotviet với nguon_url = "anh-nhap/<tên file>":
 * chạy lại không chép trùng. Ảnh số nhỏ nhất của mỗi mã (thường _1) nạp trước
 * nên thành ảnh chính.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { GDriveImageStorage } from "../src/features/images/lib/storage/gdrive-storage.server";
import {
  FULL_MAX_EDGE,
  FULL_QUALITY,
  MAX_FULL_BYTES,
  MAX_THUMB_BYTES,
  THUMB_MAX_EDGE,
  THUMB_QUALITY,
  safeFileStem,
} from "../src/features/images/lib/image-rules";
import { DungToanBo, luuVoiThuLai, nenAnh, type SharpFn } from "./_image-pipeline";
import { taoAdminClient } from "./_supabase-admin";

const args = process.argv.slice(2);
const GHI = args.includes("--ghi");
const DRIVE = args.includes("--drive");
const limitIndex = args.indexOf("--gioi-han");
const GIOI_HAN = limitIndex >= 0 ? Number(args[limitIndex + 1]) : null;
const THU_MUC = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--gioi-han") ?? path.join("data", "anh-nhap");
const SONG_SONG = 3;
const TRANG = 1000;

// Tên file trên Windows/zip có thể ở dạng NFD — chuẩn NFC rồi mới so với mã.
const exact = (s: string) => s.normalize("NFC").trim().toUpperCase();
const loose = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").trim().toUpperCase();

const MAU_TEN = /^(.+)_(\d+)\.(jpe?g|png)$/i;

type Source = { name: string; read: () => Promise<Buffer> };
type Job = Source & { code: string; order: number; productId: string };

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

function appsScriptEnv(): { url: string; secret: string } {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) {
    throw new Error("Thiếu APPS_SCRIPT_URL hoặc APPS_SCRIPT_SECRET trong .env.local — xem apps-script/README.md mục 8.");
  }
  return { url, secret };
}

/** Apps Script luôn trả HTTP 200 — lỗi nằm trong body {ok:false} (Code.gs). */
async function callAppsScript<T>(payload: Record<string, unknown>): Promise<T> {
  const { url, secret } = appsScriptEnv();
  const res = await fetch(url, { method: "POST", body: JSON.stringify({ secret, ...payload }) });
  const body = (await res.json()) as { ok: boolean; message?: string } & T;
  if (!body.ok) throw new Error(`Apps Script ${String(payload.action)}: ${body.message ?? "lỗi không rõ"}`);
  return body;
}

async function listSources(): Promise<Source[]> {
  if (DRIVE) {
    const { files } = await callAppsScript<{ files: { id: string; name: string }[] }>({
      action: "list",
      folder: "anh-nhap",
    });
    return files.map((file) => ({
      name: file.name,
      read: async () => {
        const { base64Data } = await callAppsScript<{ base64Data: string }>({ action: "get", fileId: file.id });
        return Buffer.from(base64Data, "base64");
      },
    }));
  }
  let files: string[];
  try {
    files = listFiles(THU_MUC);
  } catch {
    throw new Error(
      `Không đọc được thư mục ${THU_MUC}.\nCách xử lý: tải thư mục Drive "anh-nhap" về, giải nén vào ${THU_MUC} — hoặc chạy với --drive.`,
    );
  }
  return files.map((file) => ({ name: path.basename(file), read: async () => readFileSync(file) }));
}

type AdminClient = ReturnType<typeof taoAdminClient>;

async function readAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += TRANG) {
    const { data, error } = await fetchPage(from, from + TRANG - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < TRANG) return out;
  }
}

async function main() {
  const files = await listSources();

  const db: AdminClient = taoAdminClient();
  const products = await readAll<{ id: string; ma_hang: string }>((a, b) => db.from("san_pham").select("id, ma_hang").range(a, b));
  const byExact = new Map(products.map((p) => [exact(p.ma_hang), p.id]));
  // Khớp bỏ dấu chỉ khi không mơ hồ: "PTKF.SIĐ" và "PTKF.SID" cùng có thì không đoán.
  const looseCount = new Map<string, string[]>();
  for (const p of products) looseCount.set(loose(p.ma_hang), [...(looseCount.get(loose(p.ma_hang)) ?? []), p.id]);

  const existing = new Set(
    (
      await readAll<{ san_pham_id: string; nguon_url: string | null }>((a, b) =>
        db.from("hinh_anh").select("san_pham_id, nguon_url").not("nguon_url", "is", null).range(a, b),
      )
    ).map((h) => `${h.san_pham_id}|${h.nguon_url}`),
  );

  const wrongName: string[] = [];
  const noProduct: string[] = [];
  const ambiguous: string[] = [];
  let alreadyDone = 0;
  const jobs: Job[] = [];
  for (const source of files) {
    const name = source.name.normalize("NFC");
    const match = MAU_TEN.exec(name);
    if (!match) {
      wrongName.push(name);
      continue;
    }
    const code = match[1]!;
    let productId = byExact.get(exact(code));
    if (!productId) {
      const candidates = looseCount.get(loose(code)) ?? [];
      if (candidates.length === 1) productId = candidates[0];
      else if (candidates.length > 1) {
        ambiguous.push(name);
        continue;
      }
    }
    if (!productId) {
      noProduct.push(name);
      continue;
    }
    if (existing.has(`${productId}|anh-nhap/${name}`)) {
      alreadyDone++;
      continue;
    }
    jobs.push({ ...source, name, code, order: Number(match[2]), productId });
  }

  const report = {
    nguon: DRIVE ? "Drive anh-nhap (Apps Script)" : THU_MUC,
    tong_file: files.length,
    se_nap: jobs.length,
    so_ma: new Set(jobs.map((j) => j.productId)).size,
    da_nap_truoc: alreadyDone,
    sai_mau_ten: wrongName.length,
    khong_co_ma: noProduct.length,
    ma_mo_ho: ambiguous.length,
  };
  console.log(JSON.stringify(report, null, 2));
  const problems = [
    ...wrongName.map((n) => ["Tên không đúng mẫu mã_số.jpg/png", n]),
    ...noProduct.map((n) => ["Không có mã hàng này trong danh mục", n]),
    ...ambiguous.map((n) => ["Mã chỉ khác dấu với mã khác — ghi đúng dấu", n]),
  ];
  if (problems.length) {
    const out = path.join("data", "anh-nhap-loi.csv");
    writeFileSync(out, "﻿Lý do,Tên file\r\n" + problems.map(([r, n]) => `"${r}","${n}"`).join("\r\n"));
    console.log(`Danh sách file không nạp được: ${out}`);
  }
  if (!GHI) {
    console.log("\nChế độ kiểm tra — chưa ghi gì. Thêm --ghi để nạp.");
    return;
  }

  const storage = new GDriveImageStorage(appsScriptEnv());
  const sharp: SharpFn = (await import("sharp")).default;

  // Theo mã, số thứ tự tăng dần: ảnh đầu tiên được _chen_anh đặt làm ảnh chính.
  const sorted = [...jobs].sort((a, b) => a.productId.localeCompare(b.productId) || a.order - b.order);
  const limited = GIOI_HAN ? sorted.slice(0, GIOI_HAN) : sorted;
  const groups = new Map<string, Job[]>();
  for (const job of limited) groups.set(job.productId, [...(groups.get(job.productId) ?? []), job]);

  const errors: string[][] = [];
  let done = 0;
  let saved = 0;
  const queue = [...groups.values()];

  async function processJob(job: Job) {
    let full: Buffer;
    let thumb: Buffer;
    try {
      const buf = await job.read();
      full = await nenAnh(sharp, buf, FULL_MAX_EDGE, FULL_QUALITY, MAX_FULL_BYTES);
      thumb = await nenAnh(sharp, buf, THUMB_MAX_EDGE, THUMB_QUALITY, MAX_THUMB_BYTES);
    } catch {
      errors.push(["Không phải ảnh đọc được", job.name]);
      return;
    }
    if (full.byteLength > MAX_FULL_BYTES || thumb.byteLength > MAX_THUMB_BYTES) {
      errors.push(["Nén xong vẫn vượt dung lượng cho phép", job.name]);
      return;
    }
    const id = randomUUID();
    const fileName = `${safeFileStem(job.code)}__${id}.webp`;
    const key = await luuVoiThuLai(storage, "full", fileName, full);
    let thumbKey: string;
    try {
      thumbKey = await luuVoiThuLai(storage, "thumb", fileName, thumb);
    } catch (e) {
      await storage.remove(key).catch(() => undefined);
      throw e;
    }
    const { error } = await db.rpc("nap_anh_kiotviet", {
      p_id: id,
      p_san_pham_id: job.productId,
      p_noi_luu: storage.backend,
      p_khoa_luu: key,
      p_khoa_luu_thumb: thumbKey,
      p_nguon_url: `anh-nhap/${job.name}`,
    });
    if (error) {
      await storage.remove(key).catch(() => undefined);
      await storage.remove(thumbKey).catch(() => undefined);
      if (error.code !== "23505") errors.push([error.message, job.name]);
      return;
    }
    saved++;
  }

  async function worker() {
    for (let group = queue.shift(); group; group = queue.shift()) {
      for (const job of group) {
        try {
          await processJob(job);
        } catch (e) {
          if (e instanceof DungToanBo) throw e;
          errors.push([e instanceof Error ? e.message : String(e), job.name]);
        }
        done++;
        if (done % 20 === 0) console.log(`  đã xử lý ${done} / ${limited.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: SONG_SONG }, worker));

  console.log(`\nXong: nạp ${saved} ảnh, lỗi ${errors.length}.`);
  if (errors.length) {
    const out = path.join("data", "anh-nhap-loi-ghi.csv");
    writeFileSync(out, "﻿Lý do,Tên file\r\n" + errors.map(([r, n]) => `"${r}","${n}"`).join("\r\n"));
    console.log(`Chi tiết lỗi: ${out}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
