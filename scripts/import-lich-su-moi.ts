/**
 * Nạp lại TỪ ĐẦU vào một project mới (trống): danh mục mã hàng + lịch sử phiếu nhập
 * + hóa đơn KiotViet từ 3 file "đã process" (08/10/2026), đơn đặt dựng từ hóa đơn.
 *
 *   npx tsx scripts/import-lich-su-moi.ts <danh-muc.xlsx> <nhap-hang.xlsx> <hoa-don.xlsx> <danh-muc-nen.json>          # = kiểm tra
 *   npx tsx scripts/import-lich-su-moi.ts <danh-muc.xlsx> <nhap-hang.xlsx> <hoa-don.xlsx> <danh-muc-nen.json> --ghi    # nạp thật
 *
 * Tồn cuối = đúng cột "Tồn kho" của file danh mục: trước khi nạp, ghi phiếu Điều chỉnh
 * ngày 14/06 bằng (tồn đích − (nhập − xuất) của mọi phiếu sắp nạp) cho từng mã, ở kho
 * mặc định của mã; rồi ghi sổ phiếu theo ngày (trong ngày nhập trước, xuất sau).
 *
 * Quyết định của người dùng (08/10/2026): đối tác + nhóm hàng chép từ project demo
 * (file JSON thứ 4); người tạo / người duyệt đơn phải có tài khoản; phiếu "Đã hủy" →
 * nạp, ghi sổ rồi hủy (bút toán đảo). Người nhập / người duyệt đơn ghi thành đoạn
 * "Người nhập: X" / "Người bán: X" của ghi chú như KiotViet. Chạy lại an toàn: phiếu,
 * đơn đã có theo số thì bỏ qua.
 */
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { groupDocuments, type RpcDocument } from "../src/features/document-excel/lib/document-excel";
import { readDocumentFile } from "../src/features/document-excel/lib/document-excel-file.server";
import { readCatalogFile } from "../src/features/products/lib/read-catalog-file.server";
import { readFirstSheet, readNumber, readString } from "../src/shared/lib/excel-cell";
import type { Database, Json } from "../src/types/database.types";
import { laSoLuongHopLe, napDieuChinhDauKy, taoGhiSo, type DocLine, type ExistingDoc } from "./_nap-chung-tu";
import { dangNhapTaiKhoanNap, taoAdminClient } from "./_supabase-admin";

const [catalogFile, receiptFile, invoiceFile, seedFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const GHI = process.argv.includes("--ghi");
if (!catalogFile || !receiptFile || !invoiceFile || !seedFile) {
  throw new Error("Cần 4 đường dẫn: danh-muc.xlsx, nhap-hang.xlsx, hoa-don.xlsx, danh-muc-nen.json");
}

const OPENING_DATE = "2026-06-14";
const OPENING_NOTE = "Tồn đầu kỳ trước lịch sử KiotViet 15/06–08/10 — tồn cuối khớp danh mục 08/10";
const CANCEL_REASON = "Phiếu đã hủy trên KiotViet";
const CATALOG_BATCH = 400;
const WORKERS = 2;

const key = (s: string) => s.normalize("NFC").trim().toUpperCase();

/**
 * Làm sạch file danh mục (08/10/2026): ~55 ô ĐVT lỗi #N/A / trống / ghi nhầm "SƠN" —
 * project demo cho thấy mọi mã đó đều là "Cái"; Xử lý "xi" là công đoạn Xi mạ; mã
 * trống Xử lý (vd. CUB-30) khi tạo mới là Hàng ngoài.
 */
const UNIT_FALLBACK = "Cái";
const STAGE_ALIAS: Record<string, string> = { XI: "XI_MA" };

/** Mã đã xóa trên KiotViet ("…{DEL}") không có trong danh mục — bỏ dòng (quyết định lần nạp trước). */
const isDeletedCode = (code: string | null) => !!code && code.includes("{DEL}");

type Kind = "NHAP" | "XUAT";
type Doc = RpcDocument & { kind: Kind; creator: string; canceled: boolean };

/** Người tạo + trạng thái theo số phiếu — hai cột chỉ-để-xem mà bộ đọc chứng từ bỏ qua. */
async function readMeta(file: string, noKey: string): Promise<Map<string, { creator: string; status: string }>> {
  const sheet = await readFirstSheet(readFileSync(file));
  const out = new Map<string, { creator: string; status: string }>();
  for (const r of sheet.rows) {
    const so = readString(r.cells[noKey]);
    if (so && !out.has(so)) {
      out.set(so, { creator: readString(r.cells["nguoi_tao"]) ?? "", status: readString(r.cells["trang_thai"]) ?? "" });
    }
  }
  return out;
}

async function readDocs(file: string, kind: Kind): Promise<Doc[]> {
  const rows = await readDocumentFile(readFileSync(file), kind === "NHAP" ? "phieu-nhap" : "hoa-don");
  const { documents, issues } = groupDocuments(rows, {});
  if (issues.length) throw new Error(`${file}: ${issues.length} lỗi đọc ô, vd. ${JSON.stringify(issues.slice(0, 3))}`);
  const meta = await readMeta(file, kind === "NHAP" ? "ma_nhap_hang" : "ma_hoa_don");
  return documents.map((d) => {
    const m = meta.get(d.so);
    return { ...d, kind, creator: m?.creator ?? "", canceled: /hủy|huy/i.test(m?.status ?? "") };
  });
}

async function main() {
  const seed = JSON.parse(readFileSync(seedFile, "utf-8")) as {
    doi_tac: Array<Record<string, Json> & { ma: string; ten: string }>;
    nhom_hang: Array<[string, string]>;
  };
  const catalog = await readCatalogFile(readFileSync(catalogFile));
  if (catalog.dinhDang !== "mau_moi") throw new Error("File danh mục phải là mẫu hệ mới");
  const fixedUnit: string[] = [];
  for (const d of catalog.dong) {
    const unit = typeof d.dvt === "string" ? d.dvt.trim() : "";
    if (!unit || unit === "[object Object]" || key(unit) === "SƠN") {
      fixedUnit.push(d.ma_hang ?? "");
      d.dvt = UNIT_FALLBACK;
    }
    if (d.cong_doan && STAGE_ALIAS[key(d.cong_doan)]) d.cong_doan = STAGE_ALIAS[key(d.cong_doan)];
    if (!d.cong_doan) d.cong_doan_khi_tao_moi = "MUA_NGOAI";
  }
  const catalogSheet = await readFirstSheet(readFileSync(catalogFile));
  const target = new Map<string, number>();
  for (const r of catalogSheet.rows) {
    const code = readString(r.cells["ma_hang"]);
    if (code) target.set(key(code), readNumber(r.cells["ton_kho"]) ?? 0);
  }
  const deletedLines: string[] = [];
  const badQtyLines: string[] = [];
  // Bỏ dòng ngay khi đọc (như các script nạp cũ) để chế độ kiểm tra thấy đúng thứ sẽ nạp.
  const dropUnloadable = (list: Doc[]) =>
    list
      .map((d) => {
        const dong = d.dong.filter((l) => {
          if (isDeletedCode(l.ma_hang)) {
            deletedLines.push(`${d.so} ${l.ma_hang} ${l.so_luong}`);
            return false;
          }
          if (l.so_luong === null || !laSoLuongHopLe(l.so_luong)) {
            badQtyLines.push(`${d.so} ${l.ma_hang} ${l.so_luong}`);
            return false;
          }
          return true;
        });
        return { ...d, dong };
      })
      .filter((d) => d.dong.length > 0);
  const receipts = dropUnloadable(await readDocs(receiptFile, "NHAP"));
  const invoices = dropUnloadable(await readDocs(invoiceFile, "XUAT"));
  const docs = [...receipts, ...invoices];

  const admin = taoAdminClient();
  const readAll = async <T>(table: string, columns: string): Promise<T[]> => {
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(table as "kho").select(columns).range(from, from + 999);
      if (error) throw error;
      out.push(...((data ?? []) as T[]));
      if (!data || data.length < 1000) return out;
    }
  };

  // --- Kiểm tra (không ghi) --------------------------------------------------
  const units = await readAll<{ ma: string; ten: string }>("don_vi_tinh", "ma, ten");
  const stages = await readAll<{ ma: string; ten: string }>("cong_doan", "ma, ten");
  const warehouses = await readAll<{ id: string; ma: string; ten: string }>("kho", "id, ma, ten");
  const users = await readAll<{ id: string; ho_ten: string }>("nguoi_dung", "id, ho_ten");
  const userByName = new Map(users.map((u) => [key(u.ho_ten), u.id]));
  const knownUnit = new Set(units.flatMap((u) => [key(u.ma), key(u.ten)]));
  const knownStage = new Set(stages.flatMap((s) => [key(s.ma), key(s.ten)]));
  const knownGroup = new Set(seed.nhom_hang.flatMap(([ma, ten]) => [key(ma), key(ten)]));
  const warehouseBy = new Map(warehouses.flatMap((w) => [[key(w.ma), w.id], [key(w.ten), w.id]] as const));
  const partnerCodes = new Set(seed.doi_tac.map((p) => key(p.ma)));
  // File nhập ghi "NCC lẻ" (tên) thay cho mã NCC000000.
  const partnerByName = new Map(seed.doi_tac.map((p) => [key(p.ten), p.ma]));
  const partnerCode = (code: string | null) =>
    code && !partnerCodes.has(key(code)) ? (partnerByName.get(key(code)) ?? code) : code;

  const catalogCodes = new Set(catalog.dong.map((d) => key(d.ma_hang ?? "")));
  const missingCodes = new Set(docs.flatMap((d) => d.dong.map((l) => l.ma_hang ?? "")).filter((c) => !catalogCodes.has(key(c))));
  const missing = (values: Array<string | null | undefined>, known: Set<string>) =>
    [...new Set(values.filter((v): v is string => !!v).filter((v) => !known.has(key(v))))];
  const people = [...new Set(docs.flatMap((d) => [d.creator, d.nguoi_ban ?? "", d.nguoi_nhap ?? ""]).filter(Boolean))];
  const accountPeople = [...new Set(docs.flatMap((d) => [d.creator, d.nguoi_ban ?? ""]).filter(Boolean))];

  const report = {
    ma_hang: catalog.dong.length,
    phieu_nhap: receipts.length, phieu_nhap_da_huy: receipts.filter((d) => d.canceled).length,
    hoa_don: invoices.length, don_dat_tu_hoa_don: new Set(invoices.map((d) => d.ma_dat_hang).filter(Boolean)).size,
    dong_chung_tu: docs.reduce((s, d) => s + d.dong.length, 0),
    dong_bo_qua_ma_da_xoa: deletedLines.length,
    dong_bo_qua_so_luong_khong_hop_le: badQtyLines.length,
    vi_du_so_luong_khong_hop_le: badQtyLines.slice(0, 10),
    // Phiếu trống ngày ghi sổ vào ngày đầu kỳ (OPENING_DATE).
    phieu_khong_co_ngay: docs.filter((d) => !d.ngay).map((d) => d.so).slice(0, 20),
    dvt_sua_thanh_cai: fixedUnit.length,
    ma_trong_chung_tu_khong_co_trong_danh_muc: [...missingCodes].slice(0, 20),
    dvt_chua_co: missing(catalog.dong.map((d) => d.dvt), knownUnit),
    xu_ly_chua_co: missing(catalog.dong.map((d) => d.cong_doan), knownStage),
    nhom_hang_chua_co: missing(catalog.dong.map((d) => d.nhom_hang), knownGroup),
    kho_chua_co: missing(catalog.dong.map((d) => d.kho_mac_dinh), new Set(warehouseBy.keys())),
    doi_tac_chua_co: missing(docs.map((d) => partnerCode(d.ma_doi_tac)), partnerCodes),
    nguoi_trong_file: people,
    nguoi_chua_co_tai_khoan: accountPeople.filter((p) => !userByName.has(key(p))),
    // uq_chung_tu_hoa_don_cua_don (0078): một đơn tối đa một hóa đơn chưa hủy — vi phạm thì
    // bước nối hóa đơn chết ở cuối lần nạp, nên chặn từ bước kiểm tra.
    don_dat_nhieu_hoa_don_chua_huy: [...Map.groupBy(invoices.filter((d) => d.ma_dat_hang && !d.canceled), (d) => d.ma_dat_hang ?? "")]
      .filter(([, list]) => list.length > 1)
      .map(([so, list]) => `${so}: ${list.map((d) => d.so).join(", ")}`)
      .slice(0, 20),
  };
  console.log(JSON.stringify(report, null, 2));

  const blocking = report.ma_trong_chung_tu_khong_co_trong_danh_muc.length + report.dvt_chua_co.length +
    report.xu_ly_chua_co.length + report.nhom_hang_chua_co.length + report.kho_chua_co.length + report.doi_tac_chua_co.length +
    report.don_dat_nhieu_hoa_don_chua_huy.length;
  if (blocking) {
    console.log("\nDỪNG: danh mục còn thiếu hoặc đơn đặt có nhiều hóa đơn chưa hủy (xem các mục *_chua_co / *_khong_co / don_dat_* ở trên).");
    return;
  }
  if (report.nguoi_chua_co_tai_khoan.length) {
    console.log("\nDỪNG: tạo tài khoản đúng họ tên cho những người trên ở Cài đặt → Người dùng rồi chạy lại.");
    return;
  }
  if (!GHI) {
    console.log("\nChế độ kiểm tra — chưa ghi gì. Thêm --ghi để nạp.");
    return;
  }

  // --- 1. Đối tác + nhóm hàng (service role, upsert theo mã) ------------------
  {
    const { error } = await admin.from("doi_tac").upsert(seed.doi_tac as never, { onConflict: "ma" });
    if (error) throw new Error(`đối tác: ${error.message}`);
    const { error: groupError } = await admin
      .from("nhom_hang")
      .upsert(seed.nhom_hang.map(([ma, ten]) => ({ ma, ten })), { onConflict: "ma" });
    if (groupError) throw new Error(`nhóm hàng: ${groupError.message}`);
    console.log(`Đối tác ${seed.doi_tac.length}, nhóm hàng ${seed.nhom_hang.length}: xong`);
  }

  // --- Phiên quản lý: mã hàng + chứng từ đi qua RLS và RPC như người dùng thật --
  const user = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { persistSession: false } },
  );
  await dangNhapTaiKhoanNap(user);

  // --- 2. Mã hàng: kiểm cả file trước, rồi nạp theo lô (statement_timeout 8 giây) --
  for (const pass of ["kiem", "nap"] as const) {
    let added = 0, changed = 0;
    for (let i = 0; i < catalog.dong.length; i += CATALOG_BATCH) {
      const { data, error } = await user.rpc("nhap_danh_muc", {
        p_dong: catalog.dong.slice(i, i + CATALOG_BATCH) as unknown as Json,
        p_chi_kiem_tra: pass === "kiem",
      });
      if (error) throw new Error(`mã hàng (${pass}): ${error.message}`);
      const r = data as { them: number; sua: number; loi: Array<{ dong: number; cot: string; thong_bao: string }> };
      if (r.loi.length) throw new Error(`mã hàng: ${r.loi.length} lỗi, vd. ${JSON.stringify(r.loi.slice(0, 5))}`);
      added += r.them;
      changed += r.sua;
    }
    console.log(`Mã hàng (${pass}): thêm ${added}, sửa ${changed}`);
  }

  const products = await readAll<{ id: string; ma_hang: string; kho_mac_dinh_id: string | null }>("san_pham", "id, ma_hang, kho_mac_dinh_id");
  const productByCode = new Map(products.map((p) => [key(p.ma_hang), p]));
  const partners = await readAll<{ id: string; ma: string }>("doi_tac", "id, ma");
  const partnerId = new Map(partners.map((p) => [key(p.ma), p.id]));
  const k1 = warehouseBy.get("K1");
  if (!k1) throw new Error("Không có kho K1");
  const ghiSo = taoGhiSo(user, k1);

  const toLines = (doc: Doc): DocLine[] =>
    doc.dong.flatMap((l) => {
      const p = productByCode.get(key(l.ma_hang ?? ""));
      // Số lượng đã lọc ở dropUnloadable, mã đã kiểm ở bước kiểm tra — tới đây là lỗi lập trình.
      if (!p || l.so_luong === null || !laSoLuongHopLe(l.so_luong)) throw new Error(`${doc.so}: dòng ${l.dong} không hợp lệ`);
      return [{ san_pham_id: p.id, so_luong: l.so_luong, ghi_chu: l.ghi_chu, kho_id: p.kho_mac_dinh_id ?? k1 }];
    });

  const existing = await readAll<ExistingDoc>("chung_tu", "id, so_ct, ghi_chu, trang_thai");
  const existingSo = new Set(existing.map((c) => c.so_ct));
  const pending = docs.filter((d) => !existingSo.has(d.so));

  // --- 3. Điều chỉnh đầu kỳ 14/06: tồn đích − (nhập − xuất) theo (mã, kho mặc định) --
  const opening = await napDieuChinhDauKy({
    user, ghiSo, khoId: k1, existing, base: OPENING_NOTE, date: OPENING_DATE,
    computeAdjust: () => {
      const net = new Map<string, number>();
      for (const doc of docs) {
        if (doc.canceled) continue;
        for (const l of toLines(doc)) net.set(l.san_pham_id, (net.get(l.san_pham_id) ?? 0) + (doc.kind === "NHAP" ? 1 : -1) * l.so_luong);
      }
      return products.flatMap((p) => {
        const q = (target.get(key(p.ma_hang)) ?? 0) - (net.get(p.id) ?? 0);
        return q === 0 ? [] : [{ san_pham_id: p.id, so_luong: q, ghi_chu: null, kho_id: p.kho_mac_dinh_id ?? k1 }];
      });
    },
  });
  console.log(`Điều chỉnh đầu kỳ 14/06: ${opening}`);

  // Phiếu dở dang của lần chạy trước (đã tạo, chưa ghi sổ): làm nốt.
  for (const c of existing.filter((x) => x.trang_thai === "NHAP_LIEU")) {
    const doc = docs.find((d) => d.so === c.so_ct);
    if (doc) await ghiSo.completeDoc(c.id, c.so_ct, doc.kind, toLines(doc));
  }

  // --- 4. Ghi sổ theo ngày: trong ngày nhập trước, xuất sau ----------------------
  const header = (doc: Doc) => {
    const person = doc.kind === "NHAP" ? doc.nguoi_nhap && `Người nhập: ${doc.nguoi_nhap}` : doc.nguoi_ban && `Người bán: ${doc.nguoi_ban}`;
    return {
      so_ct: doc.so, loai_ct: doc.kind, kho_id: k1, ngay_ct: doc.ngay ?? OPENING_DATE,
      doi_tac_id: partnerId.get(key(partnerCode(doc.ma_doi_tac) ?? "")) ?? null,
      nguon_nhap: doc.kind === "NHAP" ? ("NCC" as const) : null,
      ghi_chu: [doc.ghi_chu, person].filter(Boolean).join(" · ") || null,
    };
  };
  const dates = [...new Set(pending.map((d) => d.ngay ?? ""))].sort();
  let done = 0;
  for (const date of dates) {
    for (const kind of ["NHAP", "XUAT"] as const) {
      const queue = pending.filter((d) => (d.ngay ?? "") === date && d.kind === kind).sort((a, b) => a.so.localeCompare(b.so));
      await Promise.all(Array.from({ length: WORKERS }, async () => {
        for (let doc = queue.shift(); doc; doc = queue.shift()) {
          await ghiSo.createAndPost(header(doc), toLines(doc));
          if (++done % 200 === 0) console.log(`  đã ghi sổ ${done} / ${pending.length} (${date})`);
        }
      }));
    }
  }
  console.log(`Ghi sổ xong ${done} phiếu`);

  const now = await readAll<{ id: string; so_ct: string; trang_thai: string; don_dat_hang_id: string | null }>(
    "chung_tu", "id, so_ct, trang_thai, don_dat_hang_id",
  );
  const docBySo = new Map(now.map((c) => [c.so_ct, c]));

  // --- 5. Người tạo (service role — cột hệ thống) --------------------------------
  for (const [creator, items] of Map.groupBy(docs, (d) => d.creator)) {
    const id = userByName.get(key(creator));
    const ids = items.map((d) => docBySo.get(d.so)?.id).filter((x): x is string => !!x);
    for (let i = 0; id && i < ids.length; i += 500) {
      const { error } = await admin.from("chung_tu").update({ nguoi_tao_id: id }).in("id", ids.slice(i, i + 500));
      if (error) throw error;
    }
  }

  // --- 6. Phiếu đã hủy trên KiotViet: hủy (bút toán đảo) ---------------------------
  for (const doc of docs.filter((d) => d.canceled)) {
    const row = docBySo.get(doc.so);
    if (!row || row.trang_thai === "DA_HUY") continue;
    const { error } = await user.rpc("huy_chung_tu", { p_chung_tu_id: row.id, p_ly_do: CANCEL_REASON });
    if (error) throw new Error(`${doc.so} hủy: ${error.message}`);
  }

  // --- 7. Đơn đặt: một đơn cho mỗi Mã đặt hàng, gộp MỌI hóa đơn của nó, nối hóa đơn --
  // Đơn mà mọi hóa đơn đều hủy → DA_HUY; còn lại HOAN_THANH. Dòng đơn = một dòng mỗi mã
  // (so_luong_da_xuat của hệ tính theo mã — xem _cap_nhat_tien_do_ddh, 0050), lấy từ hóa
  // đơn chưa hủy; đã xuất = đặt. Nối hóa đơn là bước CUỐI: đơn còn hóa đơn chưa nối là
  // đơn dở dang của lần trước.
  const orders = await readAll<{ id: string; so_dh: string }>("don_dat_hang", "id, so_dh");
  const orderBySo = new Map(orders.map((o) => [o.so_dh, o.id]));
  const byOrder = Map.groupBy(invoices.filter((d) => d.ma_dat_hang), (d) => d.ma_dat_hang ?? "");
  let orderCount = 0;
  for (const [so, group] of byOrder) {
    group.sort((a, b) => (a.ngay ?? "").localeCompare(b.ngay ?? "") || a.so.localeCompare(b.so));
    const unlinked = group
      .map((d) => docBySo.get(d.so))
      .filter((c): c is NonNullable<typeof c> => !!c && !c.don_dat_hang_id);
    if (unlinked.length === 0) continue;
    const first = group[0];
    const allCanceled = group.every((d) => d.canceled);
    let orderId = orderBySo.get(so);
    if (!orderId) {
      const { data, error } = await admin.from("don_dat_hang").insert({
        so_dh: so, ngay_dh: first.ngay ?? OPENING_DATE, trang_thai: allCanceled ? "DA_HUY" : "HOAN_THANH",
        doi_tac_id: partnerId.get(key(partnerCode(first.ma_doi_tac) ?? "")) ?? null,
        ghi_chu: first.ghi_chu,
        nguoi_tao_id: userByName.get(key(first.creator)) ?? null,
        nguoi_xac_nhan_id: userByName.get(key(first.nguoi_ban ?? "")) ?? null,
        ngay_xac_nhan: first.ngay ? `${first.ngay}T00:00:00+07:00` : null,
      }).select("id").single();
      if (error) throw new Error(`${so}: ${error.message}`);
      orderId = data.id;
      orderCount++;
    }
    const { count, error: countError } = await admin
      .from("don_dat_hang_dong").select("id", { count: "exact", head: true }).eq("don_dat_hang_id", orderId);
    if (countError) throw new Error(`${so} đếm dòng: ${countError.message}`);
    if (!count) {
      const sources = allCanceled ? group : group.filter((d) => !d.canceled);
      const perProduct = new Map<string, { qty: number; note: string | null }>();
      for (const l of sources.flatMap(toLines)) {
        const cur = perProduct.get(l.san_pham_id);
        perProduct.set(l.san_pham_id, { qty: (cur?.qty ?? 0) + l.so_luong, note: cur?.note ?? l.ghi_chu });
      }
      // Một lệnh insert = đủ dòng hoặc không dòng nào — lần chạy lại không gặp đơn thiếu dòng.
      const { error } = await admin.from("don_dat_hang_dong").insert(
        [...perProduct].map(([san_pham_id, { qty, note }]) => ({
          don_dat_hang_id: orderId, san_pham_id, so_luong_dat: qty, so_luong_da_xuat: allCanceled ? 0 : qty, don_gia: 0, ghi_chu: note,
        })),
      );
      if (error) throw new Error(`${so} dòng: ${error.message}`);
    }
    const { error: linkError } = await admin
      .from("chung_tu").update({ don_dat_hang_id: orderId }).in("id", unlinked.map((c) => c.id));
    if (linkError) throw linkError;
  }
  console.log(`Đơn đặt: tạo ${orderCount}`);

  // --- 8. Bộ đếm số: phiếu mới trên app đi tiếp sau số lớn nhất vừa nạp ------------
  const maxNo = (list: string[], prefix: string) =>
    Math.max(0, ...list.map((s) => new RegExp(`^${prefix}(\\d+)$`).exec(s)?.[1]).filter(Boolean).map(Number));
  for (const [loai, n] of [["NHAP", maxNo(receipts.map((d) => d.so), "PN")], ["XUAT", maxNo(invoices.map((d) => d.so), "HD")]] as const) {
    const { data } = await admin.from("chuoi_so_ct").select("so_hien_tai").eq("loai_ct", loai).eq("nam", 0).eq("nguon", "").maybeSingle();
    if ((data?.so_hien_tai ?? 0) >= n) continue;
    const { error } = await admin.from("chuoi_so_ct").upsert({ loai_ct: loai, nam: 0, nguon: "", so_hien_tai: n }, { onConflict: "loai_ct,nam,nguon" });
    if (error) throw new Error(`bộ đếm ${loai}: ${error.message}`);
  }
  {
    const n = maxNo(invoices.map((d) => d.ma_dat_hang ?? ""), "DH");
    const { data } = await admin.from("chuoi_so_dh").select("so_hien_tai").eq("nam", 0).maybeSingle();
    if ((data?.so_hien_tai ?? 0) < n) {
      const { error } = await admin.from("chuoi_so_dh").upsert({ nam: 0, so_hien_tai: n }, { onConflict: "nam" });
      if (error) throw new Error(`bộ đếm DH: ${error.message}`);
    }
  }

  // --- 9. Đối chiếu tồn cuối với file danh mục --------------------------------------
  const stock = await readAll<{ san_pham_id: string; so_luong: number }>("ton_kho", "san_pham_id, so_luong");
  const total = new Map<string, number>();
  for (const s of stock) total.set(s.san_pham_id, (total.get(s.san_pham_id) ?? 0) + Number(s.so_luong));
  const off = products.filter((p) => (total.get(p.id) ?? 0) !== (target.get(key(p.ma_hang)) ?? 0));
  console.log(off.length === 0
    ? "Tồn cuối khớp file danh mục: 100%"
    : `LỆCH TỒN ${off.length} mã, vd. ${off.slice(0, 10).map((p) => `${p.ma_hang} ${total.get(p.id) ?? 0}≠${target.get(key(p.ma_hang))}`).join("; ")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
