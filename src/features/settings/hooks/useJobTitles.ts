import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BusinessPermission } from "@/shared/lib/permissions";

import {
  deleteJobTitle,
  fetchJobTitles,
  jobTitleKeys,
  saveJobTitle,
  setJobTitlePermission,
} from "../api/job-title.api";
import { userListKey } from "../api/user.api";
import type { JobTitleFormValues } from "../schemas/job-title.schema";

export function useJobTitles() {
  return useQuery({ queryKey: jobTitleKeys.all, queryFn: fetchJobTitles });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: jobTitleKeys.all });
    // Đổi phạm vi chức vụ đổi luôn vai trò của người giữ chức vụ đó.
    void queryClient.invalidateQueries({ queryKey: userListKey });
  };
}

export function useSaveJobTitle() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { id: string | null; values: JobTitleFormValues }) => saveJobTitle(input.id, input.values),
    onSuccess: invalidate,
  });
}

export function useDeleteJobTitle() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: deleteJobTitle, onSuccess: invalidate });
}

export function useSetJobTitlePermission() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { id: string; permission: BusinessPermission; enabled: boolean }) =>
      setJobTitlePermission(input.id, input.permission, input.enabled),
    onSettled: invalidate,
  });
}
