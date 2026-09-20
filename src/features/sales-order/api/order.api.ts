import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  toOrderLineUpdate,
  toOrderUpdate,
  toOrderListRpcArgs,
  type OrderFilter,
  type OrderHeaderInput,
  type OrderLineInput,
} from "../schemas/order.schema";
import {
  toOrderDetail,
  toOrderLine,
  toOrderRow,
  type OrderDetail,
  type OrderLine,
  type OrderRow,
} from "../types";

// Hàm thuần — nhận tham số, trả dữ liệu đã có kiểu. Không JSX, không hook.
// Mọi lượt gọi Supabase đều kiểm `error`: supabase-js không tự ném lỗi.

// --- Đọc ---------------------------------------------------------------------

export async function fetchOrders(
  filter: OrderFilter,
): Promise<{ items: OrderRow[]; total: number }> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_don",
    toOrderListRpcArgs(filter),
  );
  if (error) throw error;

  const raw = data ?? [];
  return {
    items: raw.map(toOrderRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

export async function fetchOrderDetail(id: string): Promise<OrderDetail | null> {
  const { data, error } = await getSupabaseBrowserClient().rpc("chi_tiet_don", {
    p_id: id,
  });
  if (error) throw error;

  const row = data?.[0];
  return row ? toOrderDetail(row) : null;
}

export async function fetchOrderLines(id: string): Promise<OrderLine[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("dong_don", {
    p_id: id,
  });
  if (error) throw error;
  return (data ?? []).map(toOrderLine);
}

// --- Ghi: đầu đơn / dòng đơn --------------------------------------------------

/**
 * D-06: cấp số trên server rồi insert trong cùng một hàm — không ghép số ở
 * client, hai người tạo đơn cùng lúc sẽ trùng `so_dh` nếu làm vậy.
 */
export async function createOrder(input: {
  partnerId: string;
  deliveryDate?: string | null;
}): Promise<string> {
  const supabase = getSupabaseBrowserClient();

  const { data: orderNo, error: orderNoError } = await supabase.rpc(
    "sinh_so_dh",
    {},
  );
  if (orderNoError) throw orderNoError;

  const { data, error } = await supabase
    .from("don_dat_hang")
    .insert({
      so_dh: orderNo,
      doi_tac_id: input.partnerId,
      ngay_giao_du_kien: input.deliveryDate ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  return data.id;
}

/** Sửa đầu đơn: chỉ chạy được khi đơn còn TAM (policy "sua don dat hang" 0052). */
export async function updateOrderHeader(
  id: string,
  input: Partial<OrderHeaderInput>,
): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("don_dat_hang")
    .update(toOrderUpdate(input), { count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error(
      "Không lưu được — đơn đã xác nhận hoặc tài khoản không có quyền sửa.",
    );
  }
}

/**
 * `don_gia` KHÔNG được truyền — cột giữ mặc định 0 (đơn không mang giá,
 * chốt 19/09 câu 7).
 */
export async function addOrderLine(
  orderId: string,
  line: OrderLineInput,
): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("don_dat_hang_dong")
    .insert({
      don_dat_hang_id: orderId,
      san_pham_id: line.productId,
      so_luong_dat: line.quantity,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateOrderLine(
  id: string,
  line: Partial<OrderLineInput>,
): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("don_dat_hang_dong")
    .update(toOrderLineUpdate(line), { count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error("Không sửa được dòng — đơn đã xác nhận hoặc thiếu quyền.");
  }
}

export async function deleteOrderLine(id: string): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("don_dat_hang_dong")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error("Không xóa được dòng — đơn đã xác nhận hoặc thiếu quyền.");
  }
}

// --- Ghi: đổi trạng thái đơn (D-05/D-06/D-07) ---------------------------------

/** D-06: chỉ quản lý gọi được — database chặn thật, đây chỉ là lớp gọi. */
export async function approveOrder(id: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("xac_nhan_don", {
    p_id: id,
  });
  if (error) throw error;
}

/** D-07: chỉ quản lý mở khóa đơn đã xác nhận về TAM để sửa lại. */
export async function unlockOrder(id: string, reason: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("mo_khoa_don", {
    p_id: id,
    p_ly_do: reason,
  });
  if (error) throw error;
}

/** D-05: quản lý đóng sớm khi khách không lấy nốt phần còn lại. */
export async function closeOrderEarly(
  id: string,
  reason: string,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("dong_don_som", {
    p_id: id,
    p_ly_do: reason,
  });
  if (error) throw error;
}

/**
 * D-08/D-10: in được chỉ từ đơn đã xác nhận; mọi dòng phiếu xuất sinh ra điền
 * sẵn bằng số đặt. Trả `id` của chứng từ `XUAT` vừa sinh để điều hướng sang.
 */
export async function createIssueFromOrder(orderId: string): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "tao_phieu_xuat_tu_don",
    { p_don_id: orderId },
  );
  if (error) throw error;
  if (!data) {
    throw new Error("Không tạo được phiếu xuất từ đơn này.");
  }
  return data.id;
}
