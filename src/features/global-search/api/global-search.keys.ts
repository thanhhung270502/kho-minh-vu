export const globalSearchKeys = {
  all: ["global-search"] as const,
  query: (q: string) => ["global-search", q] as const,
};
