// File thuần (bẫy 9).

/**
 * PostgREST cắt mỗi lần gọi ở `max_rows` (= 1000, supabase/config.toml) — kể
 * cả RPC trả tập dòng. Màn cần TOÀN BỘ danh mục (3.266 mã, ví dụ trang Phân
 * tích) phải tải từng trang bằng `.range(from, to)` rồi ghép. Dừng khi trang
 * trả về ít hơn kích thước trang. RPC phải có ORDER BY ổn định.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}
