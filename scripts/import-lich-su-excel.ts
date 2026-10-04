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
import { SAMPLE_ACCOUNTS, samplePassword, taoAdminClient } from "./_supabase-admin";

const dir = process.argv[2];
const GHI = process.argv.includes("--ghi");
if (!dir) throw new Error("Thiếu đường dẫn thư mục chứa nhap-hang.xlsx và hoa-don.xlsx");

const OPENING_DATE = "2026-06-14";
const OPENING_NOTE = "Đưa tồn về đầu 15/06 trước khi nạp lịch sử phiếu nhập/hóa đơn KiotViet 15/06–30/09 — tồn cuối giữ nguyên";
const CANCEL_REASON = "Hóa đơn đã hủy trên KiotViet";
const BATCH = 150;
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
  const existing = await readAll<{ id: string; so_ct: string; ghi_chu: string | null; trang_thai: string }>("chung_tu", "id, so_ct, ghi_chu, trang_thai");
  const existingSo = new Set(existing.map((c) => c.so_ct));
  // Lần chạy trước dừng giữa chừng: phiếu đã tạo nhưng chưa ghi sổ (chưa đụng tồn).
  const unposted = existing.filter((c) => c.trang_thai === "NHAP_LIEU" && docs.has(c.so_ct));
  const openingDone = existing.some((c) => c.ghi_chu === OPENING_NOTE);
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
  const badQty = pending.flatMap((d) => d.lines.filter((l) => !(l.qty > 0)).map((l) => `${d.so} ${l.code}`));
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
    dieu_chinh_dau_ky_da_co: openingDone,
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
  const manager = SAMPLE_ACCOUNTS.find((a) => a.role === "quan_ly");
  if (!manager) throw new Error("Không có tài khoản quản lý mẫu");
  const { error: loginError } = await user.auth.signInWithPassword({ email: manager.email, password: samplePassword() });
  if (loginError) throw loginError;
  const { data: kho, error: khoError } = await user.from("kho").select("id").eq("ma", "K1").single();
  if (khoError) throw khoError;
  const khoId = kho.id;

  type DocLine = { san_pham_id: string; so_luong: number; ghi_chu: string | null };
  async function createAndPost(header: Database["public"]["Tables"]["chung_tu"]["Insert"], lines: DocLine[]): Promise<string> {
    const { data: ct, error } = await user.from("chung_tu").insert(header).select("id").single();
    if (error) throw new Error(`${header.so_ct}: ${error.message}`);
    const { error: lineError } = await user.from("chung_tu_dong").insert(
      lines.map((l) => ({ chung_tu_id: ct.id, san_pham_id: l.san_pham_id, so_luong: l.so_luong, don_gia: 0, thanh_tien: 0, kho_id: khoId, ghi_chu: l.ghi_chu })),
    );
    if (lineError) throw new Error(`${header.so_ct} dòng: ${lineError.message}`);
    await post(ct.id, header.so_ct ?? "", header.loai_ct ?? "");
    return ct.id;
  }

  async function post(id: string, so: string, type: string) {
    for (let attempt = 1; ; attempt++) {
      let { error } = await user.rpc("ghi_so_chung_tu", { p_chung_tu_id: id });
      if (error && type === "XUAT" && error.message.includes("Xuất quá tồn")) {
        // Thứ tự trong ngày của KiotViet không có — xuất trước nhập cùng ngày thì âm tạm.
        await user.from("chung_tu").update({ ly_do_xuat_am: "LECH_TON_CHO_KIEM_KE" }).eq("id", id);
        ({ error } = await user.rpc("ghi_so_chung_tu", { p_chung_tu_id: id }));
      }
      if (!error) return;
      // Ghi sổ là một transaction: timeout thì không ghi gì, thử lại an toàn.
      if (attempt < 5 && /timeout|deadlock|could not serialize/i.test(error.message)) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }
      throw new Error(`${so} ghi sổ: ${error.message}`);
    }
  }

  for (const c of unposted) {
    await post(c.id, c.so_ct, docs.get(c.so_ct)!.type);
    console.log(`Ghi sổ tiếp phiếu dở dang ${c.so_ct}`);
  }

  const toLines = (doc: Doc, skipped: string[]): DocLine[] =>
    doc.lines.flatMap((l) => {
      const product = productByCode.get(key(l.code));
      if (!product || !(l.qty > 0)) {
        skipped.push(`${doc.so} ${l.code}`);
        return [];
      }
      return [{ san_pham_id: product.id, so_luong: l.qty, ghi_chu: l.note }];
    });

  // --- 1. Điều chỉnh đầu kỳ 14/06: −(nhập − xuất) của các phiếu sắp nạp ------
  // Hóa đơn đã hủy không tính: ghi sổ rồi đảo ngay, ròng bằng 0.
  if (!openingDone) {
    const delta = new Map<string, number>();
    const bump = (productId: string, qty: number) => delta.set(productId, (delta.get(productId) ?? 0) + qty);
    for (const doc of pending) {
      if (doc.canceled) continue;
      const sign = doc.type === "NHAP" ? 1 : -1;
      for (const line of doc.lines) {
        const product = productByCode.get(key(line.code));
        if (!product || !(line.qty > 0)) continue;
        const parts = product.loai_hang === "COMBO" ? components.filter((c) => c.combo_id === product.id) : [];
        if (parts.length) for (const part of parts) bump(part.thanh_phan_id, sign * line.qty * Number(part.so_luong));
        else bump(product.id, sign * line.qty);
      }
    }
    const adjust = [...delta].filter(([, q]) => q !== 0).map(([san_pham_id, q]) => ({ san_pham_id, so_luong: -q, ghi_chu: null }));
    for (let i = 0; i < adjust.length; i += BATCH) {
      const { data: so, error: soError } = await user.rpc("sinh_so_ct", { p_loai: "DIEU_CHINH" });
      if (soError) throw soError;
      await createAndPost({ so_ct: so, loai_ct: "DIEU_CHINH", kho_id: khoId, ngay_ct: OPENING_DATE, ghi_chu: OPENING_NOTE }, adjust.slice(i, i + BATCH));
    }
    console.log(`Điều chỉnh đầu kỳ 14/06: ${adjust.length} mã`);
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
  const now = await readAll<{ id: string; so_ct: string; trang_thai: string }>("chung_tu", "id, so_ct, trang_thai");
  const statusBySo = new Map(now.map((c) => [c.so_ct, c]));
  created.length = 0;
  for (const doc of docs.values()) {
    const row = statusBySo.get(doc.so);
    if (row && doc.date < HISTORY_BEFORE) created.push({ doc, id: row.id });
  }
  const freshOrders = await readAll<{ id: string; so_dh: string }>("don_dat_hang", "id, so_dh");
  for (const o of freshOrders) orderBySo.set(o.so_dh, o.id);

  // --- 3. Người tạo (service role — cột hệ thống, không phải dữ liệu người dùng sửa) --
  for (const [creator, items] of Map.groupBy(created, (c) => c.doc.creator)) {
    const ids = items.map((c) => c.id);
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await admin.from("chung_tu").update({ nguoi_tao_id: userByName.get(key(creator))! }).in("id", ids.slice(i, i + 500));
      if (error) throw error;
    }
  }

  // --- 4. Đơn đặt: một đơn cho mỗi mã đặt hàng, Hoàn thành, nối hóa đơn -------
  const invoicesByOrder = Map.groupBy(created.filter((c) => c.doc.type === "XUAT" && c.doc.order && !orderBySo.has(c.doc.order)), (c) => c.doc.order!);
  let orderCount = 0;
  for (const [so, invoices] of invoicesByOrder) {
    const first = invoices[0]!.doc;
    const { data: dh, error } = await admin.from("don_dat_hang").insert({
      so_dh: so, ngay_dh: first.date, trang_thai: "HOAN_THANH",
      doi_tac_id: partnerByCode.get(key(first.partner)) ?? null,
      nguoi_tao_id: userByName.get(key(first.seller ?? first.creator)) ?? null,
    }).select("id").single();
    if (error) throw new Error(`${so}: ${error.message}`);
    const qty = new Map<string, number>();
    for (const inv of invoices) for (const l of toLines(inv.doc, [])) qty.set(l.san_pham_id, (qty.get(l.san_pham_id) ?? 0) + l.so_luong);
    const { error: lineError } = await admin.from("don_dat_hang_dong").insert(
      [...qty].map(([san_pham_id, q]) => ({ don_dat_hang_id: dh.id, san_pham_id, so_luong_dat: q, so_luong_da_xuat: q, don_gia: 0 })),
    );
    if (lineError) throw new Error(`${so} dòng: ${lineError.message}`);
    const { error: linkError } = await admin.from("chung_tu").update({ don_dat_hang_id: dh.id }).in("id", invoices.map((i) => i.id));
    if (linkError) throw linkError;
    if (++orderCount % 500 === 0) console.log(`  đã tạo ${orderCount} / ${invoicesByOrder.size} đơn đặt`);
  }
  console.log(`Đơn đặt: tạo ${orderCount}`);

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
