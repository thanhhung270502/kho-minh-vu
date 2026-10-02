import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  checkNewProducts,
  downloadNewProductErrors,
  importNewProducts,
  readNewProductUpload,
} from "../api/new-product-import.api";
import { productKeys } from "../api/product.keys";
import {
  catalogProblemsFrom,
  toCheckPayload,
  toDraftRows,
  type ImportPayloadRow,
} from "../lib/new-product-import";

/** Đọc file ở server rồi hỏi RPC (chế độ kiểm tra) mã/tên nào đã có trong danh mục. */
export function useReadNewProductFile() {
  return useMutation({
    mutationFn: async ({ file, defaultUnitId }: { file: File; defaultUnitId: string | null }) => {
      const drafts = toDraftRows(await readNewProductUpload(file), { unitId: defaultUnitId });
      const catalog = catalogProblemsFrom(await checkNewProducts(toCheckPayload(drafts)));
      return { drafts, catalog };
    },
  });
}

export function useImportNewProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, warehouseId }: { rows: ImportPayloadRow[]; warehouseId: string | null }) =>
      importNewProducts(rows, warehouseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["audit-log", "san_pham"] });
    },
  });
}

export function useDownloadNewProductErrors() {
  return useMutation({ mutationFn: downloadNewProductErrors });
}
