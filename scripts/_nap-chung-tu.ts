/**
 * Phần dùng chung của hai script nạp chứng từ KiotViet (import-chung-tu-excel,
 * import-lich-su-excel): tạo + ghi sổ phiếu, hoàn tất phiếu dở dang, và phiếu
 * Điều chỉnh đầu kỳ chia đợt có thể chạy lại.
 *
 * Vì sao phải "hoàn tất phiếu dở dang": script đi qua REST (RLS) nên tạo header,
 * thêm dòng, ghi sổ là BA request rời — không bọc được trong một transaction.
 * Dừng giữa chừng (mạng, timeout) để lại header không dòng, hoặc có dòng mà còn
 * NHAP_LIEU. Chạy lại phải nhận ra và làm nốt, không bỏ qua cũng không tạo trùng.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database.types";

type Client = SupabaseClient<Database>;
type LoaiCt = Database["public"]["Enums"]["loai_ct"];
type Header = Database["public"]["Tables"]["chung_tu"]["Insert"];

export type DocLine = { san_pham_id: string; so_luong: number; ghi_chu: string | null };
export type ExistingDoc = { id: string; so_ct: string; ghi_chu: string | null; trang_thai: string };

/** Số lượng nạp được: số thật, dương. NaN (ô chữ), Infinity, 0, âm đều bỏ. */
export const laSoLuongHopLe = (qty: number) => Number.isFinite(qty) && qty > 0;

const ADJUST_BATCH = 150;

export function taoGhiSo(user: Client, khoId: string) {
  async function post(id: string, so: string, type: string): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      let { error } = await user.rpc("ghi_so_chung_tu", { p_chung_tu_id: id });
      if (error && type === "XUAT" && error.message.includes("Xuất quá tồn")) {
        // Thứ tự trong ngày của KiotViet không có — xuất trước nhập cùng ngày thì âm tạm.
        const { error: reasonError } = await user.from("chung_tu").update({ ly_do_xuat_am: "LECH_TON_CHO_KIEM_KE" }).eq("id", id);
        if (reasonError) throw new Error(`${so} đặt lý do xuất âm: ${reasonError.message}`);
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

  async function insertLines(id: string, so: string, lines: DocLine[]): Promise<void> {
    // Một lệnh insert = một statement: hoặc đủ dòng, hoặc không dòng nào.
    const { error } = await user.from("chung_tu_dong").insert(
      lines.map((l) => ({ chung_tu_id: id, san_pham_id: l.san_pham_id, so_luong: l.so_luong, don_gia: 0, thanh_tien: 0, kho_id: khoId, ghi_chu: l.ghi_chu })),
    );
    if (error) throw new Error(`${so} dòng: ${error.message}`);
  }

  /** `lines` đã lọc hợp lệ xong TRƯỚC khi gọi — header chỉ được tạo khi có dòng để thêm. */
  async function createAndPost(header: Header, lines: DocLine[]): Promise<string> {
    const so = header.so_ct ?? "";
    if (lines.length === 0) throw new Error(`${so}: không có dòng hợp lệ, không tạo phiếu`);
    const { data: ct, error } = await user.from("chung_tu").insert(header).select("id").single();
    if (error) throw new Error(`${so}: ${error.message}`);
    await insertLines(ct.id, so, lines);
    await post(ct.id, so, header.loai_ct ?? "");
    return ct.id;
  }

  /**
   * Phiếu đã có nhưng còn NHAP_LIEU (lần chạy trước dừng giữa chừng): chưa có dòng
   * thì thêm `lines`; đã có dòng thì kiểm khớp `lines` (null = không biết dòng
   * mong đợi, tin dòng đang có) rồi ghi sổ.
   */
  async function completeDoc(id: string, so: string, type: string, lines: DocLine[] | null): Promise<void> {
    const { data: current, error } = await user.from("chung_tu_dong").select("san_pham_id").eq("chung_tu_id", id);
    if (error) throw new Error(`${so} đọc dòng: ${error.message}`);
    const rows = current ?? [];
    if (rows.length === 0) {
      if (!lines || lines.length === 0) {
        throw new Error(`${so}: phiếu dở dang không có dòng và không dựng lại được — mở phiếu xử lý tay rồi chạy lại.`);
      }
      await insertLines(id, so, lines);
    } else if (lines) {
      const have = rows.map((r) => r.san_pham_id).sort().join(",");
      const want = lines.map((l) => l.san_pham_id).sort().join(",");
      if (have !== want) {
        throw new Error(`${so}: dòng đang có không khớp dữ liệu nạp — không ghi sổ. Mở phiếu đối chiếu rồi xử lý tay.`);
      }
    }
    await post(id, so, type);
  }

  return { post, createAndPost, completeDoc };
}

type GhiSo = ReturnType<typeof taoGhiSo>;

const batchNote = (base: string, k: number, n: number) => `${base} (đợt ${k}/${n})`;

/**
 * Điều chỉnh đầu kỳ, chia đợt ADJUST_BATCH mã, mỗi đợt một phiếu ghi chú
 * "<base> (đợt k/n)". Chạy lại: đợt HOAN_THANH bỏ qua, đợt NHAP_LIEU làm nốt,
 * đợt chưa có thì tạo. Phiếu ghi chú đúng `base` (bản cũ, không số đợt) coi là
 * đã xong — chỉ ghi sổ nốt nếu còn NHAP_LIEU.
 *
 * `computeAdjust` phải cho cùng kết quả giữa các lần chạy dở: hàm này sắp theo
 * san_pham_id để đợt k luôn chứa đúng những mã đó, và đối chiếu số đợt.
 */
export async function napDieuChinhDauKy(opts: {
  user: Client;
  ghiSo: GhiSo;
  khoId: string;
  existing: ExistingDoc[];
  base: string;
  date: string;
  computeAdjust: () => DocLine[];
}): Promise<string> {
  const { user, ghiSo, khoId, existing, base, date } = opts;

  const legacy = existing.filter((c) => c.ghi_chu === base);
  if (legacy.length) {
    for (const c of legacy.filter((c) => c.trang_thai === "NHAP_LIEU")) await ghiSo.completeDoc(c.id, c.so_ct, "DIEU_CHINH", null);
    return `đã có (${legacy.length} phiếu bản cũ)`;
  }

  const pattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(đợt (\\d+)/(\\d+)\\)$`);
  const batches = new Map<number, ExistingDoc>();
  let storedTotal: number | null = null;
  for (const c of existing) {
    const m = c.ghi_chu?.match(pattern);
    if (!m) continue;
    batches.set(Number(m[1]), c);
    storedTotal = Number(m[2]);
  }
  if (storedTotal !== null) {
    const allPosted = Array.from({ length: storedTotal }, (_, i) => batches.get(i + 1)).every((c) => c?.trang_thai === "HOAN_THANH");
    if (allPosted) return `đã có đủ ${storedTotal} đợt`;
    const canceled = [...batches.values()].filter((c) => c.trang_thai === "DA_HUY");
    if (canceled.length) {
      throw new Error(`Phiếu điều chỉnh đầu kỳ đã bị hủy: ${canceled.map((c) => c.so_ct).join(", ")} — xử lý tay trước khi chạy lại.`);
    }
  }

  const adjust = opts.computeAdjust().sort((a, b) => a.san_pham_id.localeCompare(b.san_pham_id));
  const total = Math.ceil(adjust.length / ADJUST_BATCH);
  if (storedTotal !== null && storedTotal !== total) {
    throw new Error(
      `Điều chỉnh đầu kỳ dở dang có ${storedTotal} đợt nhưng lần này tính ra ${total} — dữ liệu đã đổi giữa hai lần chạy. ` +
        "Dừng để không lệch tồn; đối chiếu các phiếu điều chỉnh đã có rồi xử lý tay.",
    );
  }

  for (let k = 1; k <= total; k++) {
    const lines = adjust.slice((k - 1) * ADJUST_BATCH, k * ADJUST_BATCH);
    const found = batches.get(k);
    if (found?.trang_thai === "HOAN_THANH") continue;
    if (found) {
      await ghiSo.completeDoc(found.id, found.so_ct, "DIEU_CHINH", lines);
      continue;
    }
    const { data: so, error } = await user.rpc("sinh_so_ct", { p_loai: "DIEU_CHINH" satisfies LoaiCt });
    if (error) throw error;
    await ghiSo.createAndPost({ so_ct: so, loai_ct: "DIEU_CHINH", kho_id: khoId, ngay_ct: date, ghi_chu: batchNote(base, k, total) }, lines);
  }
  return `${adjust.length} mã, ${total} đợt`;
}
