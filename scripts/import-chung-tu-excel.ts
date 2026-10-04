/**
 * Nạp đối tác + phiếu nhập + hóa đơn từ 3 file Excel văn phòng điền (04/10/2026,
 * dữ liệu KiotViet ngày 01–03/10).
 *
 *   npx tsx --env-file=.env.local scripts/import-chung-tu-excel.ts "<thư mục>"         # = kiểm tra
 *   npx tsx --env-file=.env.local scripts/import-chung-tu-excel.ts "<thư mục>" --ghi   # nạp thật
 *
 * Tồn đã đúng sẵn (tồn đầu kỳ nạp từ sheet "data" là tồn SAU ngày 03/10). Để
 * nạp lịch sử mà tồn cuối không đổi: ghi trước phiếu Điều chỉnh ngày 30/09 bằng
 * −(nhập − xuất) của từng mã (combo tách theo thành phần), rồi ghi sổ phiếu nhập
 * và hóa đơn theo ngày — tồn cuối quay về đúng số đã nạp (nguyên tắc 1–2: tồn
 * chỉ đổi qua chứng từ).
 *
 * Quyết định của người dùng: không giá (đơn giá 0); người nhận hóa đơn là đối
 * tác NB001 (nội bộ), tên nhân viên trong file ghi vào ghi chú dòng; kho = Kho 1.
 * Số phiếu cấp theo quy tắc hệ thống (sinh_so_ct: PN26-…, PX26-…, DC26-…). Số
 * KiotViet ghi đầu ghi chú "Số KiotViet <số>" — vừa để tra, vừa để chạy lại
 * nhận ra phiếu đã nạp.
 */
import { readdirSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

import type { Database } from "../src/types/database.types";
import { SAMPLE_ACCOUNTS, samplePassword, taoAdminClient } from "./_supabase-admin";

const dir = process.argv[2];
const GHI = process.argv.includes("--ghi");
if (!dir) throw new Error("Thiếu đường dẫn thư mục chứa 3 file Excel");

const OPENING_DATE = "2026-09-30";
const OPENING_NOTE = "Đưa tồn về đầu 01/10 trước khi nạp phiếu nhập/hóa đơn KiotViet 01–03/10 — tồn cuối giữ nguyên";
const KIOTVIET_NOTE = /^Số KiotViet (\S+)/;
const BATCH = 150;

type Cell = ExcelJS.CellValue;

/** Ô Excel → chuỗi: rich text, hyperlink, công thức (lấy kết quả), ngày. */
function text(value: Cell): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((t) => t.text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return value.result == null ? "" : text(value.result as Cell);
    if ("formula" in value) return "";
    return "";
  }
  return String(value).trim();
}

const key = (s: string) => s.normalize("NFC").trim().toUpperCase();

async function readSheet(file: string): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error(`${file}: không có sheet`);
  const rows: string[][] = [];
  ws.eachRow((row, index) => {
    if (index === 1) return;
    const cells = Array.from({ length: 14 }, (_, i) => text(row.getCell(i + 1).value));
    if (cells.some((c) => c !== "")) rows.push(cells);
  });
  return rows;
}

function findFile(prefix: string): string {
  const name = readdirSync(dir).find((f) => f.startsWith(prefix) && f.endsWith(".xlsx") && !f.startsWith("~$"));
  if (!name) throw new Error(`Không thấy file ${prefix}*.xlsx trong ${dir}`);
  return path.join(dir, name);
}

type Line = { code: string; qty: number; note: string | null };
type Doc = { so: string; type: "NHAP" | "XUAT"; date: string; partner: string; note: string | null; lines: Line[] };

async function main() {
  const partnerRows = await readSheet(findFile("mau-nhap-doi-tac"));
  const receiptRows = await readSheet(findFile("mau-nhap-nhap-hang"));
  const invoiceRows = await readSheet(findFile("mau-nhap-hoa-don"));

  // --- Gom chứng từ. Cột theo file thật (khác mẫu): xem đầu file. -------------
  const docs = new Map<string, Doc>();
  const add = (doc: Omit<Doc, "lines">, line: Line) => {
    const existing = docs.get(doc.so) ?? { ...doc, lines: [] };
    existing.lines.push(line);
    docs.set(doc.so, existing);
  };
  // Nhập hàng: A mã phiếu · B ngày · D mã NCC · F ghi chú phiếu · G mã hàng · J số lượng dòng · K ghi chú dòng · L người nhập
  for (const r of receiptRows) {
    add(
      { so: r[0]!, type: "NHAP", date: r[1]!, partner: r[3]!, note: [r[5], r[11] && `Người nhập: ${r[11]}`].filter(Boolean).join(" · ") || null },
      { code: r[6]!, qty: Number(r[9] || 0), note: r[10] || null },
    );
  }
  // Hóa đơn: A mã đặt hàng · B mã hóa đơn · C ngày · E mã khách · F nhân viên nhận · H ghi chú · I mã hàng · J số lượng · L người bán
  for (const r of invoiceRows) {
    add(
      {
        so: r[1]!,
        type: "XUAT",
        date: r[2]!,
        partner: r[4] || "NB001",
        note: [r[7], r[0] && `Đơn KiotViet ${r[0]}`, r[11] && `Người bán: ${r[11]}`].filter(Boolean).join(" · ") || null,
      },
      { code: r[8]!, qty: Number(r[9] || 0), note: r[5] ? `Nhân viên nhận: ${r[5]}` : null },
    );
  }

  const admin = taoAdminClient();
  const readAll = async <T>(table: "san_pham" | "doi_tac" | "thanh_phan_combo" | "chung_tu", columns: string): Promise<T[]> => {
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
    "thanh_phan_combo",
    "combo_id, thanh_phan_id, so_luong",
  );
  const existingNotes = (await readAll<{ ghi_chu: string | null }>("chung_tu", "ghi_chu")).map((c) => c.ghi_chu ?? "");
  const existingSo = new Set(existingNotes.map((note) => KIOTVIET_NOTE.exec(note)?.[1]).filter(Boolean));
  const openingDone = existingNotes.includes(OPENING_NOTE);

  // --- Đối tác --------------------------------------------------------------
  // File: A mã · B tên · C loại (trống) · D điện thoại · F địa chỉ · G khu vực · H phường/xã · J ghi chú · K đang hoạt động
  const partnerCodes = new Set(partnerRows.map((r) => key(r[0]!)));
  const extraPartners = [...new Set([...docs.values()].map((d) => d.partner))].filter((c) => c && !partnerCodes.has(key(c)));

  // --- Kiểm tra -------------------------------------------------------------
  const unknownCodes = new Map<string, number>();
  for (const doc of docs.values()) {
    for (const line of doc.lines) {
      if (!productByCode.has(key(line.code))) unknownCodes.set(line.code, (unknownCodes.get(line.code) ?? 0) + 1);
    }
  }
  const badQty = [...docs.values()].flatMap((d) => d.lines.filter((l) => !(l.qty > 0)).map((l) => `${d.so} ${l.code}`));
  const docList = [...docs.values()];
  console.log(
    JSON.stringify(
      {
        doi_tac_trong_file: partnerRows.length,
        doi_tac_tao_them: extraPartners,
        phieu_nhap: docList.filter((d) => d.type === "NHAP").length,
        hoa_don: docList.filter((d) => d.type === "XUAT").length,
        dong: docList.reduce((s, d) => s + d.lines.length, 0),
        da_co_tren_he_thong: docList.filter((d) => existingSo.has(d.so)).length,
        ma_hang_khong_co: Object.fromEntries(unknownCodes),
        so_luong_sai: badQty,
      },
      null,
      2,
    ),
  );
  if (!GHI) {
    console.log("\nChế độ kiểm tra — chưa ghi gì. Thêm --ghi để nạp. Dòng có mã hàng không có sẽ bị BỎ khỏi phiếu.");
    return;
  }

  // --- Ghi: đối tác (service role, danh mục tham chiếu) ------------------------
  const isInternal = (code: string) => /^NB\d+/i.test(code);
  const partnerPayload = [
    ...partnerRows.map((r) => ({
      ma: r[0]!,
      ten: r[1]!,
      loai: (isInternal(r[0]!) ? "CA_HAI" : "NCC") as "CA_HAI" | "NCC",
      dien_thoai: r[3] || null,
      dia_chi: r[5] || null,
      khu_vuc: r[6] || null,
      phuong_xa: r[7] || null,
      ghi_chu: r[9] || null,
      dang_hoat_dong: r[10] !== "0",
    })),
    ...extraPartners.map((code) => ({ ma: code, ten: code, loai: "NCC" as const, dien_thoai: null, dia_chi: null, khu_vuc: null, phuong_xa: null, ghi_chu: null, dang_hoat_dong: true })),
  ];
  const { error: partnerError } = await admin.from("doi_tac").upsert(partnerPayload, { onConflict: "ma" });
  if (partnerError) throw partnerError;
  const partners = await readAll<{ id: string; ma: string }>("doi_tac", "id, ma");
  const partnerByCode = new Map(partners.map((p) => [key(p.ma), p.id]));
  console.log(`Đối tác: ghi ${partnerPayload.length}`);

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

  async function createAndPost(
    fields: Omit<Database["public"]["Tables"]["chung_tu"]["Insert"], "so_ct">,
    lines: { san_pham_id: string; so_luong: number; ghi_chu: string | null }[],
  ) {
    const { data: so, error: soError } = await user.rpc("sinh_so_ct", { p_loai: fields.loai_ct });
    if (soError) throw soError;
    const header = { ...fields, so_ct: so };
    const { data: ct, error } = await user.from("chung_tu").insert(header).select("id").single();
    if (error) throw new Error(`${header.so_ct}: ${error.message}`);
    const { error: lineError } = await user.from("chung_tu_dong").insert(
      lines.map((l) => ({ chung_tu_id: ct.id, san_pham_id: l.san_pham_id, so_luong: l.so_luong, don_gia: 0, thanh_tien: 0, kho_id: khoId, ghi_chu: l.ghi_chu })),
    );
    if (lineError) throw new Error(`${header.so_ct} dòng: ${lineError.message}`);
    let { error: postError } = await user.rpc("ghi_so_chung_tu", { p_chung_tu_id: ct.id });
    if (postError && header.loai_ct === "XUAT" && postError.message.includes("Xuất quá tồn")) {
      // Thứ tự trong ngày của KiotViet không có — xuất trước nhập cùng ngày thì âm tạm.
      await user.from("chung_tu").update({ ly_do_xuat_am: "LECH_TON_CHO_KIEM_KE" }).eq("id", ct.id);
      ({ error: postError } = await user.rpc("ghi_so_chung_tu", { p_chung_tu_id: ct.id }));
    }
    if (postError) throw new Error(`${header.so_ct} ghi sổ: ${postError.message}`);
  }

  const pending = docList.filter((d) => !existingSo.has(d.so));

  // --- 1. Điều chỉnh đầu kỳ: −(nhập − xuất), combo tách thành phần ------------
  if (!openingDone) {
    const delta = new Map<string, number>();
    const bump = (productId: string, qty: number) => delta.set(productId, (delta.get(productId) ?? 0) + qty);
    for (const doc of docList) {
      const sign = doc.type === "NHAP" ? 1 : -1;
      for (const line of doc.lines) {
        const product = productByCode.get(key(line.code));
        if (!product) continue;
        const parts = product.loai_hang === "COMBO" ? components.filter((c) => c.combo_id === product.id) : [];
        if (parts.length) for (const part of parts) bump(part.thanh_phan_id, sign * line.qty * Number(part.so_luong));
        else bump(product.id, sign * line.qty);
      }
    }
    const adjust = [...delta].filter(([, q]) => q !== 0).map(([san_pham_id, q]) => ({ san_pham_id, so_luong: -q, ghi_chu: null }));
    for (let i = 0; i < adjust.length; i += BATCH) {
      await createAndPost(
        {
          loai_ct: "DIEU_CHINH",
          kho_id: khoId,
          ngay_ct: OPENING_DATE,
          ghi_chu: OPENING_NOTE,
        },
        adjust.slice(i, i + BATCH),
      );
    }
    console.log(`Điều chỉnh đầu kỳ: ${adjust.length} mã`);
  }

  // --- 2. Phiếu nhập rồi hóa đơn, theo ngày ----------------------------------
  pending.sort((a, b) => a.date.localeCompare(b.date) || (a.type === b.type ? a.so.localeCompare(b.so) : a.type === "NHAP" ? -1 : 1));
  let done = 0;
  const skippedLines: string[] = [];
  for (const doc of pending) {
    const lines = doc.lines.flatMap((l) => {
      const product = productByCode.get(key(l.code));
      if (!product || !(l.qty > 0)) {
        skippedLines.push(`${doc.so} ${l.code}`);
        return [];
      }
      return [{ san_pham_id: product.id, so_luong: l.qty, ghi_chu: l.note }];
    });
    if (lines.length === 0) continue;
    await createAndPost(
      {
        loai_ct: doc.type,
        kho_id: khoId,
        ngay_ct: doc.date,
        doi_tac_id: partnerByCode.get(key(doc.partner)) ?? null,
        nguon_nhap: doc.type === "NHAP" ? "NCC" : null,
        ghi_chu: `Số KiotViet ${doc.so}${doc.note ? ` · ${doc.note}` : ""}`,
      },
      lines,
    );
    done++;
    if (done % 25 === 0) console.log(`  đã ghi sổ ${done} / ${pending.length}`);
  }
  console.log(`\nXong: ghi sổ ${done} phiếu. Dòng bỏ qua (mã không có): ${skippedLines.length}`);
  if (skippedLines.length) console.log(skippedLines.join("\n"));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

