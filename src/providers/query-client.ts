import { QueryClient, isServer } from "@tanstack/react-query";
import { PostgrestError } from "@supabase/supabase-js";

const SO_LAN_THU_LAI_TOI_DA = 2;

/**
 * PostgrestError là lỗi đã tới được database và bị từ chối: sai câu truy vấn,
 * RLS chặn, vi phạm ràng buộc... Thử lại vẫn hỏng y hệt, chỉ làm người dùng
 * chờ lâu hơn. Chỉ thử lại lỗi mạng / lỗi không rõ nguồn.
 */
function nenThuLai(soLanDaHong: number, error: unknown): boolean {
  if (error instanceof PostgrestError) {
    return false;
  }

  return soLanDaHong < SO_LAN_THU_LAI_TOI_DA;
}

function taoQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dữ liệu sản xuất thay đổi liên tục nhưng không theo từng giây.
        // 30s đủ để khỏi gọi lại thừa khi chuyển qua lại giữa các màn hình.
        staleTime: 30_000,
        retry: nenThuLai,
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Ghi dữ liệu (tạo phiếu nhập/xuất kho) không được tự thử lại:
        // rủi ro tạo trùng bản ghi.
        retry: false,
      },
    },
  });
}

let queryClientTrinhDuyet: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  // Trên server mỗi request phải có cache riêng, nếu không dữ liệu của người
  // dùng này sẽ lọt sang người dùng khác.
  if (isServer) {
    return taoQueryClient();
  }

  queryClientTrinhDuyet ??= taoQueryClient();
  return queryClientTrinhDuyet;
}
