import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { partnerKeys } from "../api/partner.keys";
import {
  decideNote,
  fetchNoteCounts,
  fetchNotes,
  noteReviewKeys,
  searchCustomers,
  undoNoteDecision,
  type NoteDecision,
  type NoteFilter,
} from "../api/note-review.api";

export function useNotes(filter: NoteFilter) {
  return useQuery({
    queryKey: noteReviewKeys.list(filter),
    queryFn: () => fetchNotes(filter),
    placeholderData: keepPreviousData,
  });
}

export function useNoteCounts() {
  return useQuery({ queryKey: noteReviewKeys.counts, queryFn: fetchNoteCounts });
}

/** Quyết một giá trị có thể TẠO đối tác mới → làm mới cả hai cụm cache. */
function useRefreshNotes() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: noteReviewKeys.all });
    void queryClient.invalidateQueries({ queryKey: partnerKeys.all });
  };
}

export function useDecideNote() {
  const refresh = useRefreshNotes();
  return useMutation({
    mutationFn: (decision: NoteDecision) => decideNote(decision),
    onSuccess: refresh,
  });
}

export function useUndoNoteDecision() {
  const refresh = useRefreshNotes();
  return useMutation({
    mutationFn: (value: string) => undoNoteDecision(value),
    onSuccess: refresh,
  });
}

export function useCustomerSearch(q: string) {
  return useQuery({
    queryKey: noteReviewKeys.customerSearch(q),
    queryFn: () => searchCustomers(q),
    staleTime: 30_000,
  });
}
