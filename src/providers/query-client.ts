import { MutationCache, QueryCache, QueryClient, isServer } from "@tanstack/react-query";
import { PostgrestError } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { dienGiaiLoi } from "@/shared/lib/errors";

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

/**
 * Quản lý vừa MỞ RỘNG quyền cho một tài khoản thì token đang cầm vẫn mang claim cũ,
 * nên database trả 42501 (xem D-05). Làm mới phiên MỘT lần rồi thử lại là đủ —
 * quyền bị thu hẹp thì lần thử lại vẫn 42501 và dừng ở đó, không lặp vô hạn.
 */
let dangLamMoiPhien: Promise<unknown> | null = null;

async function lamMoiPhienMotLan(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  dangLamMoiPhien ??= getSupabaseBrowserClient()
    .auth.refreshSession()
    .finally(() => {
      dangLamMoiPhien = null;
    });

  const ketQua = (await dangLamMoiPhien) as { error?: unknown } | undefined;

  if (ketQua?.error) {
    // Refresh token đã bị thu hồi (quản lý vô hiệu hóa tài khoản). Tải lại cả trang
    // chứ không điều hướng mềm: phải vứt sạch cache TanStack Query của phiên cũ.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/dang-nhap?loi=vo-hieu-hoa");
    return false;
  }

  return true;
}

function taoQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
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
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (dienGiaiLoi(error).loai !== "khong-du-quyen") return;
        if (query.state.fetchFailureCount > 1) return;

        void lamMoiPhienMotLan().then((daLamMoi) => {
          if (daLamMoi) void queryClient.invalidateQueries({ queryKey: query.queryKey });
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        // KHÔNG tự chạy lại mutation: ghi hai lần nguy hiểm hơn bắt người dùng bấm lại.
        if (dienGiaiLoi(error).loai === "khong-du-quyen") void lamMoiPhienMotLan();
      },
    }),
  });

  return queryClient;
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
