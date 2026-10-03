import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { codeDictionaryKeys, fetchCodeEntries } from "../api/code-dictionary.api";
import { dictionaryFromEntries } from "../lib/sync-entries";

/** Bộ mã hóa cho form và bảng danh mục. Đổi mỗi ngày một lần (job đồng bộ) — cache dài. */
export function useCodeDictionary() {
  const query = useQuery({
    queryKey: codeDictionaryKeys.all,
    queryFn: fetchCodeEntries,
    staleTime: 30 * 60_000,
  });
  const dictionary = useMemo(() => dictionaryFromEntries(query.data ?? []), [query.data]);
  return { ...query, entries: query.data ?? [], dictionary };
}
