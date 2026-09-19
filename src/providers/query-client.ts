import {
  MutationCache,
  QueryCache,
  QueryClient,
  isServer,
} from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { explainError, isPostgrestError } from "@/shared/lib/errors";

const MAX_RETRIES = 2;

/**
 * Lỗi PostgREST là lỗi đã tới được database và bị từ chối: sai câu truy vấn,
 * RLS chặn, vi phạm ràng buộc... Thử lại vẫn hỏng y hệt, chỉ làm người dùng
 * chờ lâu hơn. Chỉ thử lại lỗi mạng / lỗi không rõ nguồn.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isPostgrestError(error)) {
    return false;
  }

  return failureCount < MAX_RETRIES;
}

/**
 * Quản lý vừa MỞ RỘNG quyền cho một tài khoản thì token đang cầm vẫn mang claim cũ,
 * nên database trả 42501 (xem D-05). Làm mới phiên MỘT lần rồi thử lại là đủ —
 * quyền bị thu hẹp thì lần thử lại vẫn 42501 và dừng ở đó, không lặp vô hạn.
 */
let refreshInFlight: Promise<unknown> | null = null;

async function refreshSessionOnce(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  refreshInFlight ??= getSupabaseBrowserClient()
    .auth.refreshSession()
    .finally(() => {
      refreshInFlight = null;
    });

  const result = (await refreshInFlight) as { error?: unknown } | undefined;

  if (result?.error) {
    // Refresh token đã bị thu hồi (quản lý vô hiệu hóa tài khoản). Tải lại cả page
    // chứ không điều hướng mềm: phải vứt sạch cache TanStack Query của phiên cũ.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/dang-nhap?loi=vo-hieu-hoa");
    return false;
  }

  return true;
}

function createQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Danh mục và tồn kho đổi liên tục nhưng không theo từng giây.
        // 30s đủ để khỏi gọi lại thừa khi chuyển qua lại giữa các màn hình.
        staleTime: 30_000,
        retry: shouldRetry,
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
        if (explainError(error).kind !== "forbidden") return;
        if (query.state.fetchFailureCount > 1) return;

        void refreshSessionOnce().then((refreshed) => {
          if (refreshed) {
            void queryClient.invalidateQueries({ queryKey: query.queryKey });
          }
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        // KHÔNG tự chạy lại mutation: ghi hai lần nguy hiểm hơn bắt người dùng bấm lại.
        if (explainError(error).kind === "forbidden") void refreshSessionOnce();
      },
    }),
  });

  return queryClient;
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  // Trên server mỗi request phải có cache riêng, nếu không dữ liệu của người
  // dùng này sẽ lọt sang người dùng khác.
  if (isServer) {
    return createQueryClient();
  }

  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}
