import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  toCreateOrderRpcArgs,
  toAddOrderLineRpcArgs,
  toOrderLineUpdate,
  toSetOrderRecipientsRpcArgs,
  toOrderUpdate,
  toOrderListRpcArgs,
  toOrderStatusCountRpcArgs,
  type OrderFilter,
  type OrderHeaderInput,
  type OrderLineInput,
  type OrderRecipientsInput,
} from "../schemas/order.schema";
import {
  toAddOrderLineResult,
  toOrderDetail,
  toOrderLine,
  toOrderRow,
  toOrderStatusCounts,
  type AddOrderLineResult,
  type OrderDetail,
  type OrderLine,
  type OrderRow,
  type OrderStatusCounts,
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

export async function fetchOrderStatusCounts(filter: OrderFilter): Promise<OrderStatusCounts> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "dem_don_theo_trang_thai",
    toOrderStatusCountRpcArgs(filter),
  );
  if (error) throw error;
  return toOrderStatusCounts(data ?? []);
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
 * Số đơn và người nhận ghi trong MỘT transaction ở `tao_don` — bất biến D3
 * (đơn nội bộ >= 1 người) kiểm lúc commit nên không thể insert rời.
 */
export async function createOrder(input: OrderRecipientsInput): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "tao_don",
    toCreateOrderRpcArgs(input),
  );
  if (error) throw error;
  if (!data) throw new Error("Không tạo được đơn.");
  return data;
}

/** Đổi người nhận cả đơn trong một transaction (bẫy 8: lỗi là object thường). */
export async function setOrderRecipients(
  orderId: string,
  input: OrderRecipientsInput,
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc(
    "dat_nguoi_nhan_don",
    toSetOrderRecipientsRpcArgs(orderId, input),
  );
  if (error) throw error;
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
      "Không lưu được — đơn đã duyệt hoặc tài khoản không có quyền sửa.",
    );
  }
}

/**
 * Thêm dòng qua RPC (0094): trùng mã + cùng người nhận dòng thì cộng dồn vào dòng
 * cũ trong MỘT transaction (D-03). Không insert thẳng — select-rồi-update ở client
 * là hai lệnh rời, hai lần gõ nhanh sẽ đua nhau.
 */
export async function addOrderLine(
  orderId: string,
  line: OrderLineInput,
): Promise<AddOrderLineResult> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "them_dong_don",
    toAddOrderLineRpcArgs(orderId, line),
  );
  if (error) throw error;
  const row = data?.[0];
  if (!row) {
    throw new Error(
      "Không thêm được dòng — đơn đã duyệt hoặc tài khoản không có quyền sửa.",
    );
  }
  return toAddOrderLineResult(row);
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
    throw new Error("Không sửa được dòng — đơn đã duyệt hoặc thiếu quyền.");
  }
}

export async function deleteOrderLine(id: string): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("don_dat_hang_dong")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) {
    throw new Error("Không xóa được dòng — đơn đã duyệt hoặc thiếu quyền.");
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
 * Hoàn thành đơn (0078): tạo hóa đơn từ đơn + ghi sổ trong MỘT transaction.
 * `reason` là mã lý do xuất âm (negative-reasons.ts) — chỉ gửi khi lần gọi
 * trước bị từ chối vì xuất âm. Trả `id` hóa đơn vừa ghi sổ.
 */
export async function completeOrder(
  orderId: string,
  reason?: { code: string; note: string | null },
): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc("hoan_thanh_don", {
    p_don_id: orderId,
    ...(reason ? { p_ly_do_xuat_am: reason.code, p_ghi_chu_ly_do: reason.note ?? undefined } : {}),
  });
  if (error) throw error;
  if (!data) throw new Error("Không hoàn thành được đơn này.");
  return data.id;
}

/** Hủy đơn chưa hoàn thành — chỉ quản lý, lý do >= 5 ký tự (0078). */
export async function cancelOrder(id: string, reason: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("huy_don", {
    p_id: id,
    p_ly_do: reason,
  });
  if (error) throw error;
}
