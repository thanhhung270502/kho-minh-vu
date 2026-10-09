export type DownloadResult = { ok: true } | { ok: false; message: string };

/** Tải một file từ route trả blob; lỗi thì đọc JSON để hiện câu tiếng Việt. */
export async function downloadFile(
  url: string,
  fallbackName = "tai-ve.xlsx",
  init?: RequestInit,
): Promise<DownloadResult> {
  const response = await fetch(url, init);

  if (!response.ok) {
    try {
      const body = (await response.json()) as { title?: string; action?: string };
      return {
        ok: false,
        message: `${body.title ?? "Không tải được file"}. ${body.action ?? ""}`,
      };
    } catch {
      return { ok: false, message: "Không tải được file. Thử lại sau ít phút." };
    }
  }

  const blob = await response.blob();
  const fileName =
    /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ??
    fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Thu hồi ngay sau khi trình duyệt nhận lệnh tải, không giữ blob trong bộ nhớ.
  URL.revokeObjectURL(objectUrl);

  return { ok: true };
}
