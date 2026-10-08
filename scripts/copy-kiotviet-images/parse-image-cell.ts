/**
 * Đọc ô "Hình ảnh (url1,url2...)" của file export KiotViet và quyết định ảnh
 * nào cần chép — thuần, không đụng filesystem hay mạng, để test được bằng
 * Vitest (parse-image-cell.test.ts).
 */

export function parseImageCell(cell: string | null | undefined): string[] {
  if (!cell) return [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const raw of cell.split(",")) {
    const url = raw.trim();
    if (url === "") continue;
    if (!/^https?:\/\//i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export type SourceRow = { code: string; urls: string[] };

export type CopyJob = {
  productId: string;
  productCode: string;
  url: string;
  order: number;
};

export type CopyPlan = {
  jobs: CopyJob[];
  unknownCodes: string[];
  alreadyCopied: number;
  productsWithImages: number;
  totalImages: number;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function buildCopyPlan(
  rows: SourceRow[],
  productIdByCode: Map<string, string>,
  existing: Set<string>,
): CopyPlan {
  const jobs: CopyJob[] = [];
  const unknownCodes: string[] = [];
  const seenUnknown = new Set<string>();
  let alreadyCopied = 0;
  let productsWithImages = 0;
  let totalImages = 0;

  for (const row of rows) {
    if (row.urls.length === 0) continue;
    productsWithImages += 1;
    totalImages += row.urls.length;

    const productId = productIdByCode.get(normalizeCode(row.code));
    if (!productId) {
      if (!seenUnknown.has(row.code)) {
        seenUnknown.add(row.code);
        unknownCodes.push(row.code);
      }
      continue;
    }

    row.urls.forEach((url, order) => {
      const key = `${productId}|${url}`;
      if (existing.has(key)) {
        alreadyCopied += 1;
        return;
      }
      jobs.push({ productId, productCode: row.code, url, order });
    });
  }

  return { jobs, unknownCodes, alreadyCopied, productsWithImages, totalImages };
}
