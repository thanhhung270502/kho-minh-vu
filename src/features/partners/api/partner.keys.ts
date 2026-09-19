import type { PartnerFilter, PartnerKind } from "../types";

export const partnerKeys = {
  all: ["partners"] as const,
  list: (filter: PartnerFilter) => ["partners", "list", filter] as const,
  detail: (id: string) => ["partners", "detail", id] as const,
  history: (id: string, page: number) => ["partners", "history", id, page] as const,
  suggestedCode: (kind: PartnerKind) => ["partners", "suggested-code", kind] as const,
};
