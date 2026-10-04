import type { GlobalSearchResult, SearchKind } from "../types";

export const SEARCH_GROUP_ORDER: SearchKind[] = ["product", "document", "order", "partner"];

export const SEARCH_GROUP_LABELS: Record<SearchKind, string> = {
  product: "Mã hàng",
  document: "Phiếu",
  order: "Đơn đặt",
  partner: "Đối tác",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  NHAP: "Phiếu nhập",
  XUAT: "Hóa đơn",
  TRA_NCC: "Trả NCC",
  TRA_KHACH: "Khách trả",
  KIEM_KE: "Kiểm kê",
};

const DOCUMENT_BASE: Record<string, string> = {
  NHAP: "/nhap-kho",
  XUAT: "/duyet-don",
  TRA_NCC: "/tra-hang",
  TRA_KHACH: "/tra-hang",
  KIEM_KE: "/kiem-ke",
};

/** null = chưa có màn chi tiết cho loại này (chuyển kho) — palette hiển thị nhưng không điều hướng. */
export function searchResultHref(result: GlobalSearchResult): string | null {
  switch (result.kind) {
    case "product":
      return `/danh-muc/${result.id}`;
    case "order":
      return `/don-dat/${result.id}`;
    // Trang đối tác chưa có chi tiết; `q` là tham số tìm của danh sách.
    case "partner":
      return `/doi-tac?q=${encodeURIComponent(result.label)}`;
    case "document": {
      const base = result.documentType ? DOCUMENT_BASE[result.documentType] : undefined;
      return base ? `${base}/${result.id}` : null;
    }
  }
}

export type SearchGroup = { kind: SearchKind; title: string; items: GlobalSearchResult[] };

export function groupSearchResults(results: GlobalSearchResult[]): SearchGroup[] {
  return SEARCH_GROUP_ORDER.map((kind) => ({
    kind,
    title: SEARCH_GROUP_LABELS[kind],
    items: results.filter((r) => r.kind === kind),
  })).filter((g) => g.items.length > 0);
}

/** Bẫy 15: mã khớp tuyệt đối đứng trước kết quả đầu tiên. */
export function defaultActiveIndex(flat: { label: string }[], query: string): number {
  if (flat.length === 0) return -1;
  const q = query.trim().toLowerCase();
  const exact = flat.findIndex((r) => r.label.toLowerCase() === q);
  return exact >= 0 ? exact : 0;
}
