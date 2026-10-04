/**
 * Nạp danh mục mã hàng từ sheet "data" đã chuẩn quy chuẩn (04/10/2026).
 *
 *   npx tsx --env-file=.env.local scripts/import-ma-hang-sheet.ts <file.csv>          # = kiểm tra, không ghi
 *   npx tsx --env-file=.env.local scripts/import-ma-hang-sheet.ts <file.csv> --ghi    # nạp thật
 *
 * Đi qua RPC nhap_ma_hang_moi (0088) với phiên quản lý demo — để tồn đầu kỳ vào
 * sổ bằng phiếu Điều chỉnh có ghi sổ (nguyên tắc 1–2), không ghi thẳng bảng.
 * Tên Hãng/Dòng/Linh kiện/Xử lý trong sheet tra ra MÃ trong ma_hoa (đồng bộ
 * từ sheet NGUON) — san_pham lưu mã, không lưu tên.
 *
 * Giả định khi sheet để trống: ĐVT trống = "Cái"; Xử lý trống = Hàng ngoài
 * (RPC tự đặt); Kho mặc định trống = Kho 1.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { parseCsv } from "../src/features/product-codes/lib/source-sheet";
import type { Database, Json } from "../src/types/database.types";
import { SAMPLE_ACCOUNTS, samplePassword, taoAdminClient } from "./_supabase-admin";

const file = process.argv[2];
const GHI = process.argv.includes("--ghi");
if (!file) throw new Error("Thiếu đường dẫn file CSV");

const key = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").trim().toUpperCase();
const categoryCode = (name: string) => key(name).replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

type Row = Record<string, string>;

function readRows(): Row[] {
  const [header, ...body] = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
  return body
    .filter((cells) => (cells[1] ?? "").trim() !== "")
    .map((cells) => Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? "").trim()])));
}

async function main() {
  const rows = readRows();
  const admin = taoAdminClient();

  const [kho, dvt, congDoan, maHoa, nhom] = await Promise.all([
    admin.from("kho").select("id, ma, ten"),
    admin.from("don_vi_tinh").select("id, ma, ten"),
    admin.from("cong_doan").select("id, ma, ten, ma_quy_chuan"),
    admin.from("ma_hoa").select("loai, ma, ten, ma_hang"),
    admin.from("nhom_hang").select("id, ma, ten"),
  ]);
  for (const r of [kho, dvt, congDoan, maHoa, nhom]) if (r.error) throw r.error;

  const khoByName = new Map((kho.data ?? []).map((k) => [key(k.ten), k.id]));
  const dvtByName = new Map((dvt.data ?? []).flatMap((d) => [[key(d.ten), d.id], [key(d.ma), d.id]] as const));
  const dict = maHoa.data ?? [];
  const lookup = (loai: string, ten: string, hang?: string) =>
    dict.find((m) => m.loai === loai && key(m.ten) === key(ten) && (hang === undefined || key(m.ma_hang ?? "") === key(hang)))?.ma;
  // Xử lý: tên trong sheet có thể là tên ma_hoa ("xi"), tên công đoạn ("Sắt") hoặc chính mã ("ABS").
  const xuLyCode = (ten: string) =>
    lookup("xu_ly", ten) ??
    (congDoan.data ?? []).find((c) => c.ma_quy_chuan && (key(c.ten) === key(ten) || key(c.ma_quy_chuan) === key(ten)))?.ma_quy_chuan ??
    undefined;

  // PostgREST trả tối đa 1.000 dòng một lần — đọc theo trang, không thì mã thứ 1.001 trở đi "không có".
  async function allProducts(): Promise<{ id: string; ma_hang: string }[]> {
    const out: { id: string; ma_hang: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from("san_pham").select("id, ma_hang").range(from, from + 999);
      if (error) throw error;
      out.push(...(data ?? []));
      if (!data || data.length < 1000) return out;
    }
  }

  const problems: string[] = [];
  const unmapped: Record<string, Set<string>> = {};
  const miss = (field: string, value: string) => (unmapped[field] ??= new Set()).add(value);

  // Nhóm hàng chưa có thì tạo (danh mục tham chiếu, không đụng tồn).
  const nhomByName = new Map((nhom.data ?? []).map((n) => [key(n.ten), n.id]));
  const newCategories = [...new Set(rows.map((r) => r["Nhóm hàng"]).filter((n) => n && !nhomByName.has(key(n))))];

  const byKho = new Map<string, Record<string, Json>[]>();
  const combos: { code: string; parts: string }[] = [];
  rows.forEach((r, index) => {
    const line = index + 2;
    const code = r["Mã hàng"];
    const isCombo = key(r["Loại hàng"]).startsWith("COMBO");
    const khoId = khoByName.get(key(r["Kho mặc định"] || "Kho 1"));
    if (!khoId) problems.push(`Dòng ${line} ${code}: kho "${r["Kho mặc định"]}" không có`);

    const dvtId = dvtByName.get(key(r["Đơn vị tính"] || "Cái"));
    if (!dvtId) miss("Đơn vị tính", r["Đơn vị tính"]);

    const hang = r["Hãng xe"] ? lookup("hang", r["Hãng xe"]) : undefined;
    if (r["Hãng xe"] && !hang) miss("Hãng xe", r["Hãng xe"]);
    const dong = r["Dòng xe"] && hang ? lookup("dong", r["Dòng xe"], hang) : undefined;
    if (r["Dòng xe"] && !dong) miss("Dòng xe", `${r["Hãng xe"]} / ${r["Dòng xe"]}`);
    const linhKien = r["Nhóm linh kiện"] ? lookup("linh_kien", r["Nhóm linh kiện"]) : undefined;
    if (r["Nhóm linh kiện"] && !linhKien) miss("Nhóm linh kiện", r["Nhóm linh kiện"]);
    const xuLy = r["Nhóm xử lý"] ? xuLyCode(r["Nhóm xử lý"]) : undefined;
    if (r["Nhóm xử lý"] && !xuLy) miss("Nhóm xử lý", r["Nhóm xử lý"]);

    const tonText = r["Tồn hiện tại"].replace(/\./g, "").replace(",", ".");
    const ton = Number(tonText || "0");
    if (!Number.isFinite(ton)) problems.push(`Dòng ${line} ${code}: tồn "${r["Tồn hiện tại"]}" không phải số`);
    if (ton < 0) problems.push(`Dòng ${line} ${code}: tồn âm ${ton} — RPC không nhận tồn âm`);
    if (isCombo && r["Hàng thành phần"]) combos.push({ code, parts: r["Hàng thành phần"] });

    // Khóa jsonb là hợp đồng với RPC nhap_ma_hang_moi (0088).
    const payload: Record<string, Json> = {
      dong: line,
      ma_hang: code,
      ten_hang: r["Tên hàng"],
      ton_kho: isCombo ? 0 : ton,
      dvt_id: dvtId ?? null,
      nhom_hang_id: null,
      nhom_hang_ten: r["Nhóm hàng"] || null,
      loai_hang: isCombo ? "COMBO" : "HANG_HOA",
      hang_xe: hang ?? null,
      dong_xe: dong ?? null,
      linh_kien: linhKien ?? null,
      ma_xu_ly: xuLy ?? null,
      dang_kinh_doanh: r["Đang kinh doanh"] !== "0",
      mo_ta: r["Ghi chú"] || null,
    };
    const k = khoId ?? "";
    byKho.set(k, [...(byKho.get(k) ?? []), payload]);
  });

  const report = {
    so_dong: rows.length,
    theo_kho: Object.fromEntries([...byKho].map(([k, v]) => [(kho.data ?? []).find((x) => x.id === k)?.ten ?? k, v.length])),
    nhom_hang_moi: newCategories.length,
    combo: combos.length,
    khong_khop: Object.fromEntries(Object.entries(unmapped).map(([f, s]) => [f, [...s]])),
    loi: problems,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!GHI) {
    console.log("\nChế độ kiểm tra — chưa ghi gì. Thêm --ghi để nạp.");
    return;
  }

  // 1. Nhóm hàng mới.
  if (newCategories.length) {
    const { data, error } = await admin
      .from("nhom_hang")
      .insert(newCategories.map((ten) => ({ ma: categoryCode(ten) || "NHOM", ten })))
      .select("id, ten");
    if (error) throw error;
    for (const n of data ?? []) nhomByName.set(key(n.ten), n.id);
  }
  for (const list of byKho.values()) {
    for (const p of list) {
      p.nhom_hang_id = p.nhom_hang_ten ? (nhomByName.get(key(String(p.nhom_hang_ten))) ?? null) : null;
      delete p.nhom_hang_ten;
    }
  }

  // 2. Phiên quản lý demo — RPC kiểm co_quyen('tao_ma_hang') theo auth.uid().
  const user = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
    auth: { persistSession: false },
  });
  const manager = SAMPLE_ACCOUNTS.find((a) => a.role === "quan_ly");
  if (!manager) throw new Error("Không có tài khoản quản lý mẫu");
  const { error: loginError } = await user.auth.signInWithPassword({ email: manager.email, password: samplePassword() });
  if (loginError) throw loginError;

  // Lô 50 dòng: RPC dò trùng tên trên cả bảng cho từng dòng — lô lớn vượt
  // statement timeout 8s của vai trò authenticated khi danh mục đã đầy. Mỗi lô
  // là một phiếu tồn đầu riêng. Mã đã có (lần chạy trước bị ngắt) thì bỏ qua,
  // để chạy lại an toàn.
  const BATCH = 50;
  const done = new Set((await allProducts()).map((p) => key(p.ma_hang)));
  const errors: unknown[] = [];
  for (const [khoId, all] of byKho) {
    const list = all.filter((p) => !done.has(key(String(p.ma_hang))));
    console.log(`Kho ${khoId}: ${all.length - list.length} mã đã có, còn ${list.length} mã`);
    for (let start = 0; start < list.length; start += BATCH) {
      const batch = list.slice(start, start + BATCH);
      const { data, error } = await user.rpc("nhap_ma_hang_moi", { p_dong: batch as Json, p_kho_id: khoId, p_chi_kiem_tra: false });
      if (error) throw new Error(`Lô dòng ${String(batch[0]?.dong)}–${String(batch.at(-1)?.dong)}: ${error.message}`);
      const result = data as { them: number; so_loi: number; loi: unknown[]; so_ct: string | null };
      console.log(`Kho ${khoId} lô ${start / BATCH + 1}: thêm ${result.them}, lỗi ${result.so_loi}, phiếu ${result.so_ct ?? "—"}`);
      errors.push(...result.loi);
    }
  }

  // 3. Thành phần combo.
  const idByCode = new Map((await allProducts()).map((p) => [key(p.ma_hang), p.id]));
  for (const combo of combos) {
    const comboId = idByCode.get(key(combo.code));
    const parts = combo.parts.split("|").map((part) => {
      const [code, qty] = part.split(":");
      return { thanh_phan_id: idByCode.get(key(code ?? "")), so_luong: Number(qty ?? "1"), code };
    });
    const missing = parts.filter((p) => !p.thanh_phan_id).map((p) => p.code);
    if (!comboId || missing.length) {
      errors.push({ ma_hang: combo.code, ly_do: `Combo thiếu mã thành phần: ${missing.join(", ") || "chính combo"}` });
      continue;
    }
    const { error } = await user.rpc("luu_thanh_phan_combo", {
      p_combo_id: comboId,
      p_thanh_phan: parts.map(({ thanh_phan_id, so_luong }) => ({ thanh_phan_id, so_luong })) as Json,
    });
    if (error) errors.push({ ma_hang: combo.code, ly_do: error.message });
  }

  writeFileSync(file.replace(/\.csv$/, "-loi.json"), JSON.stringify(errors, null, 2));
  console.log(`\nXong. ${errors.length} dòng lỗi — chi tiết ở ${file.replace(/\.csv$/, "-loi.json")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
