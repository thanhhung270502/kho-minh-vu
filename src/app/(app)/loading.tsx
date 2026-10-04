/**
 * Khung chờ khi chuyển trang. Nằm dưới `AppShell` nên menu giữ nguyên, chỉ vùng
 * nội dung đổi — bấm menu là có phản hồi ngay thay vì đứng hình chờ server.
 *
 * Server Component, cố ý không dùng antd `Skeleton` (bẫy 1): Tailwind là đủ.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Đang tải trang" className="animate-pulse">
      <div className="mb-5 flex flex-col gap-2">
        <div className="h-7 w-56 rounded-md bg-trung-tinh-150" />
        <div className="h-4 w-80 max-w-full rounded bg-trung-tinh-100" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="h-9 w-64 max-w-full rounded-md bg-trung-tinh-100" />
        <div className="h-9 w-32 rounded-md bg-trung-tinh-100" />
      </div>

      <div className="overflow-hidden rounded-lg border border-trung-tinh-150 bg-white">
        <div className="h-10 border-b border-trung-tinh-150 bg-trung-tinh-50" />
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-trung-tinh-100 px-4 py-3 last:border-b-0"
          >
            <div className="h-4 w-24 rounded bg-trung-tinh-100" />
            <div className="h-4 flex-1 rounded bg-trung-tinh-100" />
            <div className="hidden h-4 w-20 rounded bg-trung-tinh-100 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
