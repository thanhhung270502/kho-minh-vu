/**
 * Nạp LỊCH SỬ phiếu nhập + hóa đơn KiotViet (15/06 → 03/10/2026) từ 2 file văn
 * phòng làm lại (04/10/2026): nhap-hang.xlsx, hoa-don.xlsx.
 *
 *   npx tsx --env-file=.env.local scripts/import-lich-su-excel.ts "<thư mục>"         # = kiểm tra
 *   npx tsx --env-file=.env.local scripts/import-lich-su-excel.ts "<thư mục>" --ghi   # nạp thật
 *
 * Phiếu đã có trên hệ thống (theo số) bỏ qua — chạy lại an toàn. Tồn cuối KHÔNG
 * đổi: trước khi nạp, ghi một phiếu Điều chỉnh ngày 14/06 bằng −(nhập − xuất) của
 * đúng các phiếu sắp nạp (combo tách theo thành phần), rồi ghi sổ theo ngày.
 *
 * Quyết định của người dùng: không giá; người nhận mặc định NB001; kho = Kho 1;
 * dòng có mã hàng chưa có → bỏ dòng; hóa đơn "Đã hủy" → nạp, ghi sổ rồi hủy
 * (bút toán đảo) để còn dấu vết. Người tạo / người bán phải có tài khoản.
 */
import { readdirSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

import type { Database } from "../src/types/database.types";
import { laSoLuongHopLe, napDieuChinhDauKy, taoGhiSo, type DocLine, type ExistingDoc } from "./_nap-chung-tu";
import { dangNhapTaiKhoanNap, taoAdminClient } from "./_supabase-admin";

const dir = process.argv[2];
const GHI = process.argv.includes("--ghi");
if (!dir) throw new Error("Thiếu đường dẫn thư mục chứa nhap-hang.xlsx và hoa-don.xlsx");

const OPENING_DATE = "2026-06-14";
const OPENING_NOTE = "Đưa tồn về đầu 15/06 trước khi nạp lịch sử phiếu nhập/hóa đơn KiotViet 15/06–30/09 — tồn cuối giữ nguyên";
const CANCEL_REASON = "Hóa đơn đã hủy trên KiotViet";
// 6 luồng làm ghi_so_chung_tu tranh khóa tồn kho đến quá statement_timeout — 2 là đủ.
const WORKERS = 2;
const HISTORY_BEFORE = "2026-10-01";

type Cell = ExcelJS.CellValue;

function text(value: Cell): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((t) => t.text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return value.result == null ? "" : text(value.result as Cell);
    return "";
  }
  return String(value).trim();
}

const key = (s: string) => s.normalize("NFC").trim().toUpperCase();
const name = (s: string) => s.normalize("NFC").trim().replace(/\s+/g, " ");

async function readSheet(file: string, columns: number): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error(`${file}: không có sheet`);
  const rows: string[][] = [];
  ws.eachRow((row, index) => {
    if (index === 1) return;
    const cells = Array.from({ length: columns }, (_, i) => text(row.getCell(i + 1).value));
    if (cells.some((c) => c !== "")) rows.push(cells);
  });
  return rows;
}

function findFile(prefix: string): string {
  const file = readdirSync(dir).find((f) => f.startsWith(prefix) && f.endsWith(".xlsx") && !f.startsWith("~$"));
  if (!file) throw new Error(`Không thấy file ${prefix}*.xlsx trong ${dir}`);
  return path.join(dir, file);
}

type Line = { code: string; qty: number; note: string | null };
type Doc = {
  so: string;
  type: "NHAP" | "XUAT";
  date: string;
  partner: string;
  note: string | null;
  creator: string;
  seller: string | null;
  order: string | null;
  canceled: boolean;
  lines: Line[];
};

async function main() {
  // Nhập hàng: A mã · B ngày · D mã NCC · F ghi chú phiếu · G mã hàng · J số lượng · K ghi chú dòng · L người nhập · M người tạo
  const receiptRows = await readSheet(findFile("nhap-hang"), 13);
  // Hóa đơn: A mã đặt hàng · B mã HĐ · C ngày · E mã khách · G nhân viên nhận · I ghi chú · J mã hàng · K số lượng · M người bán · N người tạo · O trạng thái
  const invoiceRows = await readSheet(findFile("hoa-don"), 15);

  const docs = new Map<string, Doc>();
  const add = (doc: Omit<Doc, "lines">, line: Line) => {
    const existing = docs.get(doc.so) ?? { ...doc, lines: [] };
    existing.lines.push(line);
    docs.set(doc.so, existing);
  };
  for (const r of receiptRows) {
    add(
      {
        so: r[0]!, type: "NHAP", date: r[1]!, partner: r[3]!,
        note: [r[5], r[11] && `Người nhập: ${name(r[11])}`].filter(Boolean).join(" · ") || null,
        creator: name(r[12] || r[11] || ""), seller: null, order: null, canceled: false,
      },
      { code: r[6]!, qty: Number(r[9] || 0), note: r[10] || null },
    );
  }
  for (const r of invoiceRows) {
    add(
      {
        so: r[1]!, type: "XUAT", date: r[2]!, partner: r[4] || "NB001",
        note: [r[8], r[12] && `Người bán: ${name(r[12])}`].filter(Boolean).join(" · ") || null,
        creator: name(r[13] || ""), seller: r[12] ? name(r[12]) : null, order: r[0] || null,
        canceled: r[14] === "Đã hủy",
      },
      { code: r[9]!, qty: Number(r[10] || 0), note: r[6] ? `Nhân viên nhận: ${r[6]}` : null },
    );
  }

  const admin = taoAdminClient();
  type Table = "san_pham" | "doi_tac" | "thanh_phan_combo" | "chung_tu" | "nguoi_dung" | "don_dat_hang";
  const readAll = async <T>(table: Table, columns: string): Promise<T[]> => {
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(table).select(columns).range(from, from + 999);
      if (error) throw error;
      out.push(...((data ?? []) as T[]));
      if (!data || data.length < 1000) return out;
    }
  };
  const products = await readAll<{ id: string; ma_hang: string; loai_hang: string }>("san_pham", "id, ma_hang, loai_hang");
  const productByCode = new Map(products.map((p) => [key(p.ma_hang), p]));
  const components = await readAll<{ combo_id: string; thanh_phan_id: string; so_luong: number }>(
    "thanh_phan_combo", "combo_id, thanh_phan_id, so_luong",
  );
  const partners = await readAll<{ id: string; ma: string }>("doi_tac", "id, ma");
  const partnerByCode = new Map(partners.map((p) => [key(p.ma), p.id]));
  const users = await readAll<{ id: string; ho_ten: string }>("nguoi_dung", "id, ho_ten");
  const userByName = new Map(users.map((u) => [key(name(u.ho_ten)), u.id]));
  const existing = await readAll<ExistingDoc>("chung_tu", "id, so_ct, ghi_chu, trang_thai");
  const existingSo = new Set(existing.map((c) => c.so_ct));
  // Lần chạy trước dừng giữa chừng: phiếu đã tạo nhưng chưa ghi sổ (chưa đụng tồn).
  const unposted = existing.filter((c) => c.trang_thai === "NHAP_LIEU" && docs.has(c.so_ct));
  const openingDone = existing.some((c) => c.ghi_chu?.startsWith(OPENING_NOTE));
  const orders = await readAll<{ id: string; so_dh: string }>("don_dat_hang", "id, so_dh");
  const orderBySo = new Map(orders.map((o) => [o.so_dh, o.id]));

  const pending = [...docs.values()].filter((d) => !existingSo.has(d.so));
  const unknownCodes = new Map<string, number>();
  for (const doc of pending) for (const l of doc.lines) {
    if (!productByCode.has(key(l.code))) unknownCodes.set(l.code, (unknownCodes.get(l.code) ?? 0) + 1);
  }
  const people = new Set(pending.flatMap((d) => [d.creator, d.seller ?? ""]).filter(Boolean));
  const missingPeople = [...people].filter((p) => !userByName.has(key(p)));
  const missingPartners = [...new Set(pending.map((d) => d.partner))].filter((p) => !partnerByCode.has(key(p)));
  const badQty = pending.flatMap((d) => d.lines.filter((l) => !laSoLuongHopLe(l.qty)).map((l) => `${d.so} ${l.code}`));
  const dates = pending.map((d) => d.date).sort();

  console.log(JSON.stringify({
    phieu_trong_file: docs.size,
    da_co_tren_he_thong: docs.size - pending.length,
    se_nap: {
      phieu_nhap: pending.filter((d) => d.type === "NHAP").length,
      hoa_don: pending.filter((d) => d.type === "XUAT").length,
      hoa_don_da_huy: pending.filter((d) => d.canceled).length,
      dong: pending.reduce((s, d) => s + d.lines.length, 0),
      tu_ngay: dates[0], den_ngay: dates.at(-1),
      don_dat_moi: new Set(pending.map((d) => d.order).filter((o): o is string => !!o && !orderBySo.has(o))).size,
    },
    dieu_chinh_dau_ky_da_co_phieu: openingDone,
    phieu_do_dang_se_ghi_so_tiep: unposted.map((c) => c.so_ct),
    ma_hang_khong_co: { so_ma: unknownCodes.size, so_dong: [...unknownCodes.values()].reduce((a, b) => a + b, 0) },
    nguoi_chua_co_tai_khoan: missingPeople,
    doi_tac_chua_co: missingPartners,
    so_luong_sai: badQty.length,
  }, null, 2));

  if (missingPeople.length || missingPartners.length) {
    console.log("\nDỪNG: còn người chưa có tài khoản hoặc đối tác chưa có — tạo trước rồi chạy lại.");
    return;
  }
  if (!GHI) {
    console.log("\nChế độ kiểm tra — chưa ghi gì. Thêm --ghi để nạp.");
    return;
  }

  // --- Phiên quản lý: chứng từ đi qua RLS + ghi_so_chung_tu như người dùng thật --
  const user = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
    auth: { persistSession: false },
  });
  await dangNhapTaiKhoanNap(user);
  const { data: kho, error: khoError } = await user.from("kho").select("id").eq("ma", "K1").single();
  if (khoError) throw khoError;
  const khoId = kho.id;

  const ghiSo = taoGhiSo(user, khoId);
  const { createAndPost } = ghiSo;

  const toLines = (doc: Doc, skipped: string[]): DocLine[] =>
    doc.lines.flatMap((l) => {
      const product = productByCode.get(key(l.code));
      if (!product || !laSoLuongHopLe(l.qty)) {
        skipped.push(`${doc.so} ${l.code}`);
        return [];
      }
      return [{ san_pham_id: product.id, so_luong: l.qty, ghi_chu: l.note }];
    });

  // --- 1. Điều chỉnh đầu kỳ 14/06: −(nhập − xuất) của các phiếu sắp nạp ------
  // Hóa đơn đã hủy không tính: ghi sổ rồi đảo ngay, ròng bằng 0. Phiếu chứng từ
  // chỉ được tạo SAU khi đủ mọi đợt điều chỉnh, nên khi còn đợt dở dang thì
  // `pending` vẫn đúng tập của lần chạy đầu — đợt làm nốt ra đúng nội dung cũ.
  const opening = await napDieuChinhDauKy({
    user, ghiSo, khoId, existing, base: OPENING_NOTE, date: OPENING_DATE,
    computeAdjust: () => {
      const delta = new Map<string, number>();
      const bump = (productId: string, qty: number) => delta.set(productId, (delta.get(productId) ?? 0) + qty);
      for (const doc of pending) {
        if (doc.canceled) continue;
        const sign = doc.type === "NHAP" ? 1 : -1;
        for (const line of doc.lines) {
          const product = productByCode.get(key(line.code));
          if (!product || !laSoLuongHopLe(line.qty)) continue;
          const parts = product.loai_hang === "COMBO" ? components.filter((c) => c.combo_id === product.id) : [];
          if (parts.length) for (const part of parts) bump(part.thanh_phan_id, sign * line.qty * Number(part.so_luong));
          else bump(product.id, sign * line.qty);
        }
      }
      return [...delta].filter(([, q]) => q !== 0).map(([san_pham_id, q]) => ({ san_pham_id, so_luong: -q, ghi_chu: null }));
    },
  });
  console.log(`Điều chỉnh đầu kỳ 14/06: ${opening}`);

  // Phiếu dở dang của lần chạy trước: header có thể chưa có dòng — làm nốt rồi ghi sổ.
  for (const c of unposted) {
    const doc = docs.get(c.so_ct);
    if (!doc) continue;
    await ghiSo.completeDoc(c.id, c.so_ct, doc.type, toLines(doc, []));
    console.log(`Ghi sổ tiếp phiếu dở dang ${c.so_ct}`);
  }

  // --- 2. Ghi sổ theo ngày: trong một ngày nhập trước, xuất sau; chạy song song --
  const byDate = new Map<string, Doc[]>();
  for (const doc of pending) (byDate.get(doc.date) ?? byDate.set(doc.date, []).get(doc.date)!).push(doc);
  const skippedLines: string[] = [];
  const created: Array<{ doc: Doc; id: string }> = [];
  let done = 0;
  for (const date of [...byDate.keys()].sort()) {
    for (const type of ["NHAP", "XUAT"] as const) {
      const queue = byDate.get(date)!.filter((d) => d.type === type).sort((a, b) => a.so.localeCompare(b.so));
      await Promise.all(Array.from({ length: WORKERS }, async () => {
        for (let doc = queue.shift(); doc; doc = queue.shift()) {
          const lines = toLines(doc, skippedLines);
          if (lines.length === 0) continue;
          const id = await createAndPost({
            so_ct: doc.so, loai_ct: doc.type, kho_id: khoId, ngay_ct: doc.date,
            doi_tac_id: partnerByCode.get(key(doc.partner)) ?? null,
            nguon_nhap: doc.type === "NHAP" ? "NCC" : null,
            ghi_chu: doc.note,
          }, lines);
          created.push({ doc, id });
          if (++done % 200 === 0) console.log(`  đã ghi sổ ${done} / ${pending.length} (${date})`);
        }
      }));
    }
  }
  console.log(`Ghi sổ xong ${done} phiếu. Dòng bỏ qua (mã không có): ${skippedLines.length}`);

  // Bước 3–5 làm trên TOÀN BỘ phiếu lịch sử đang có (kể cả của lần chạy trước bị
  // dừng) — mỗi bước tự bỏ qua phần đã làm, chạy lại an toàn.
  const now = await readAll<{ id: string; so_ct: string; trang_thai: string; don_dat_hang_id: string | null }>(
    "chung_tu", "id, so_ct, trang_thai, don_dat_hang_id",
  );
  const statusBySo = new Map(now.map((c) => [c.so_ct, c]));
  created.length = 0;
  for (const doc of docs.values()) {
    const row = statusBySo.get(doc.so);
    if (row && doc.date < HISTORY_BEFORE) created.push({ doc, id: row.id });
  }
  const freshOrders = await readAll<{ id: string; so_dh: string; trang_thai: string; ngay_dh: string }>(
    "don_dat_hang", "id, so_dh, trang_thai, ngay_dh",
  );
  for (const o of freshOrders) orderBySo.set(o.so_dh, o.id);
  const freshOrderBySo = new Map(freshOrders.map((o) => [o.so_dh, o]));

  // --- 3. Người tạo (service role — cột hệ thống, không phải dữ liệu người dùng sửa) --
  for (const [creator, items] of Map.groupBy(created, (c) => c.doc.creator)) {
    const ids = items.map((c) => c.id);
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await admin.from("chung_tu").update({ nguoi_tao_id: userByName.get(key(creator))! }).in("id", ids.slice(i, i + 500));
      if (error) throw error;
    }
  }

  // --- 4. Đơn đặt: một đơn cho mỗi mã đặt hàng, Hoàn thành, nối hóa đơn -------
  // Một đơn = 3 request service-role rời (header → dòng → nối hóa đơn); REST không
  // bọc được chúng trong một transaction. Lần chạy trước dừng giữa chừng để lại
  // đơn có header mà thiếu dòng, hoặc hóa đơn chưa nối. Vì nối hóa đơn là bước
  // CUỐI, đơn dở dang luôn còn hóa đơn của file chưa nối — đó là dấu để làm nốt.
  // Chỉ sửa đơn trông như do script tạo (HOAN_THANH/DA_HUY, đúng ngày hóa đơn đầu);
  // đơn trùng số tạo trong app thì để nguyên như trước.
  const invoicesByOrder = Map.groupBy(created.filter((c) => c.doc.type === "XUAT" && c.doc.order), (c) => c.doc.order!);
  let orderCount = 0;
  let repairedCount = 0;
  for (const [so, invoices] of invoicesByOrder) {
    const first = invoices[0]!.doc;
    const unlinked = invoices.filter((i) => statusBySo.get(i.doc.so)?.don_dat_hang_id == null);
    const found = freshOrderBySo.get(so);
    let orderId: string;
    let needLines: boolean;
    if (!found) {
      const { data: dh, error } = await admin.from("don_dat_hang").insert({
        so_dh: so, ngay_dh: first.date, trang_thai: "HOAN_THANH",
        doi_tac_id: partnerByCode.get(key(first.partner)) ?? null,
        nguoi_tao_id: userByName.get(key(first.seller ?? first.creator)) ?? null,
      }).select("id").single();
      if (error) throw new Error(`${so}: ${error.message}`);
      orderId = dh.id;
      needLines = true;
      orderCount++;
    } else {
      const looksImported = ["HOAN_THANH", "DA_HUY"].includes(found.trang_thai) && found.ngay_dh.slice(0, 10) === first.date;
      if (unlinked.length === 0 || !looksImported) continue;
      const { count, error: countError } = await admin
        .from("don_dat_hang_dong").select("id", { count: "exact", head: true }).eq("don_dat_hang_id", found.id);
      if (countError) throw new Error(`${so} đếm dòng: ${countError.message}`);
      orderId = found.id;
      needLines = (count ?? 0) === 0;
      repairedCount++;
      console.log(`  làm nốt đơn đặt dở dang ${so}${needLines ? " (thêm dòng)" : ""}, nối ${unlinked.length} hóa đơn`);
    }
    if (needLines) {
      const qty = new Map<string, number>();
      for (const inv of invoices) for (const l of toLines(inv.doc, [])) qty.set(l.san_pham_id, (qty.get(l.san_pham_id) ?? 0) + l.so_luong);
      const { error: lineError } = await admin.from("don_dat_hang_dong").insert(
        [...qty].map(([san_pham_id, q]) => ({ don_dat_hang_id: orderId, san_pham_id, so_luong_dat: q, so_luong_da_xuat: q, don_gia: 0 })),
      );
      if (lineError) throw new Error(`${so} dòng: ${lineError.message}`);
    }
    const { error: linkError } = await admin.from("chung_tu").update({ don_dat_hang_id: orderId }).in("id", unlinked.map((i) => i.id));
    if (linkError) throw linkError;
    if (orderCount > 0 && orderCount % 500 === 0 && !found) console.log(`  đã tạo ${orderCount} đơn đặt`);
  }
  console.log(`Đơn đặt: tạo ${orderCount}, làm nốt ${repairedCount}`);

  // --- 5. Hóa đơn đã hủy trên KiotViet: hủy (bút toán đảo), đơn của nó cũng hủy --
  for (const { doc, id } of created.filter((c) => c.doc.canceled && statusBySo.get(c.doc.so)?.trang_thai !== "DA_HUY")) {
    const { error } = await user.rpc("huy_chung_tu", { p_chung_tu_id: id, p_ly_do: CANCEL_REASON });
    if (error) throw new Error(`${doc.so} hủy: ${error.message}`);
    if (doc.order) {
      const { error: orderError } = await admin.from("don_dat_hang").update({ trang_thai: "DA_HUY" }).eq("so_dh", doc.order);
      if (orderError) throw orderError;
    }
  }
  console.log(`Đã hủy ${created.filter((c) => c.doc.canceled).length} hóa đơn hủy trên KiotViet`);
  if (skippedLines.length) console.log(`Dòng bỏ qua:\n${skippedLines.join("\n")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
