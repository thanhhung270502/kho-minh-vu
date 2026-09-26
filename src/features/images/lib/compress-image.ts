import {
  FALLBACK_QUALITY,
  FULL_MAX_EDGE,
  FULL_QUALITY,
  MAX_FULL_BYTES,
  MAX_THUMB_BYTES,
  THUMB_MAX_EDGE,
  THUMB_QUALITY,
  checkPickedFile,
  scaleToFit,
} from "./image-rules";

/**
 * Lỗi nén ảnh có sẵn câu tiếng Việt + hướng dẫn làm gì tiếp — không ném lỗi kỹ
 * thuật thẳng ra giao diện (CLAUDE.md Bước 5).
 */
export class ImageProcessingError extends Error {
  constructor(
    readonly title: string,
    readonly action: string,
  ) {
    super(`${title}. ${action}`);
    this.name = "ImageProcessingError";
  }
}

function encode(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const { width, height } = scaleToFit(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ImageProcessingError(
      "Trình duyệt không vẽ được ảnh",
      "Mở bằng Chrome hoặc Safari bản mới rồi thử lại.",
    );
  }
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== "image/webp") {
          reject(
            new ImageProcessingError(
              "Trình duyệt này không nén được ảnh WebP",
              "Mở bằng Chrome hoặc Safari bản mới rồi thử lại.",
            ),
          );
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

async function encodeUnderLimit(
  bitmap: ImageBitmap,
  maxEdge: number,
  maxBytes: number,
): Promise<Blob> {
  const quality = maxEdge === FULL_MAX_EDGE ? FULL_QUALITY : THUMB_QUALITY;
  let blob = await encode(bitmap, maxEdge, quality);
  if (blob.size > maxBytes) {
    blob = await encode(bitmap, maxEdge, FALLBACK_QUALITY);
  }
  if (blob.size > maxBytes) {
    throw new ImageProcessingError(
      "Ảnh sau khi nén vẫn quá lớn",
      "Chụp lại gần hơn hoặc ảnh ít chi tiết hơn rồi thử lại.",
    );
  }
  return blob;
}

/**
 * Nén ảnh trình duyệt thành WebP cạnh dài 1200px + thumb 300px (D-05). Dùng
 * Canvas — `toBlob` âm thầm trả PNG khi trình duyệt không mã hóa được WebP nên
 * phải kiểm `blob.type` (research).
 */
export async function compressImage(file: File): Promise<{ full: Blob; thumb: Blob }> {
  const problem = checkPickedFile(file);
  if (problem) {
    throw new ImageProcessingError(problem.title, problem.action);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageProcessingError(
      `Không đọc được ảnh ${file.name}`,
      "Nếu là ảnh HEIC từ iPhone, chụp lại bằng nút Chụp ảnh hoặc xuất JPEG rồi chọn lại.",
    );
  }

  try {
    const full = await encodeUnderLimit(bitmap, FULL_MAX_EDGE, MAX_FULL_BYTES);
    const thumb = await encodeUnderLimit(bitmap, THUMB_MAX_EDGE, MAX_THUMB_BYTES);
    return { full, thumb };
  } finally {
    bitmap.close();
  }
}
