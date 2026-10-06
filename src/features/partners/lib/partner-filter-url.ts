// File thuần (bẫy 9): bộ lọc đối tác <-> tham số URL. Màn danh sách và route
// xuất Excel (server) cùng đọc một cách.
import { DEFAULT_PARTNER_FILTER, type ActiveStatus, type PartnerFilter, type PartnerKind } from "../types";

const VALID_KINDS: PartnerKind[] = ["NCC", "KHACH", "CA_HAI"];

/** Giá trị tham số URL `hoat_dong` — bề mặt người dùng, giữ tiếng Việt. */
const ACTIVE_STATUS_TO_URL: Record<ActiveStatus, string> = {
  active: "dang",
  inactive: "ngung",
  all: "tat_ca",
};

const URL_TO_ACTIVE_STATUS: Record<string, ActiveStatus> = {
  dang: "active",
  ngung: "inactive",
  tat_ca: "all",
};

export function readPartnerFilterFromUrl(params: {
  get(k: string): string | null;
}): PartnerFilter {
  const kind = params.get("loai");
  const active = params.get("hoat_dong");
  const page = Number(params.get("trang"));

  return {
    q: params.get("q")?.trim() ?? "",
    kind: VALID_KINDS.includes(kind as PartnerKind) ? (kind as PartnerKind) : null,
    activeStatus:
      (active ? URL_TO_ACTIVE_STATUS[active] : undefined) ??
      DEFAULT_PARTNER_FILTER.activeStatus,
    page: Number.isFinite(page) && page >= 1 ? Math.trunc(page) : 1,
  };
}

export function writePartnerFilterToUrl(filter: PartnerFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.kind) params.set("loai", filter.kind);
  if (filter.activeStatus !== DEFAULT_PARTNER_FILTER.activeStatus) {
    params.set("hoat_dong", ACTIVE_STATUS_TO_URL[filter.activeStatus]);
  }
  if (filter.page !== 1) params.set("trang", String(filter.page));
  return params;
}
