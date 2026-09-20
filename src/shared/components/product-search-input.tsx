"use client";

import { useQuery } from "@tanstack/react-query";
import { Select, Typography } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { useState, type Ref } from "react";

import {
  productSearchKeys,
  searchProducts,
  type ProductSearchResult,
} from "@/shared/api/product-search.api";

export type { ProductSearchResult };

type Props = {
  onSelect: (product: ProductSearchResult) => void;
  inputRef?: Ref<RefSelectProps>;
  disabled?: boolean;
};

/**
 * Ô gõ mã hàng của bảng dòng. Chọn xong tự xóa ô để gõ mã kế tiếp — luồng nhập
 * liệu là gõ liên tục, không phải chọn từng cái rồi bấm chuột (D-07).
 */
export function ProductSearchInput({ onSelect, inputRef, disabled }: Props) {
  const [query, setQuery] = useState("");

  const results = useQuery({
    queryKey: productSearchKeys.search(query),
    queryFn: () => searchProducts(query),
    enabled: query.trim().length >= 1,
    staleTime: 30_000,
  });

  function selectFirstMatch(): boolean {
    const items = results.data ?? [];
    if (items.length === 0) return false;

    // Gõ ĐÚNG mã thì phải ra đúng mã đó. `tim_san_pham` xếp theo
    // `lan_phat_sinh_cuoi` trước rồi mới tới độ giống — hợp lý khi gõ dở, nhưng
    // khiến mã chạy nhiều đè lên mã khớp tuyệt đối. Kho gõ mã đầy đủ suốt ngày,
    // chọn nhầm ở đây là nhập sai hàng.
    const normalized = query.trim().toLowerCase();
    const exactMatch = items.find(
      (item) => item.code.toLowerCase() === normalized,
    );

    onSelect(exactMatch ?? items[0]);
    setQuery("");
    return true;
  }

  return (
    // Bắt Enter ở LỚP BỌC NGOÀI, pha capture — tức là TRƯỚC rc-select.
    // Enter mặc định của antd có chọn option, nhưng ngay sau đó rc-select gọi
    // focus() về chính ô tìm của nó, nuốt mất lệnh chuyển sang ô Số lượng mà
    // `onSelect` hẹn trong setTimeout. Chặn ở pha capture thì focus mới ở lại
    // đúng ô kế tiếp. Đo tận tay ở UAT Phase 3 bài 5.
    <div
      className="w-full"
      onKeyDownCapture={(event) => {
        if (event.key !== "Enter") return;
        if (selectFirstMatch()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <Select
        ref={inputRef}
        showSearch
        value={null}
        // `searchValue` phải controlled thì mới xóa được ô sau khi TỰ chọn bằng
        // Enter (đường onChange của antd không chạy trong nhánh đó).
        searchValue={query}
        disabled={disabled}
        className="w-full min-w-56"
        placeholder="Gõ mã hoặc tên hàng"
        filterOption={false}
        loading={results.isFetching}
        onSearch={setQuery}
        notFoundContent={
          results.isFetching
            ? "Đang tìm…"
            : query
              ? "Không có mã nào khớp. Kiểm tra lại hoặc tạo mã mới ở Danh mục."
              : "Gõ để tìm mã hàng"
        }
        options={(results.data ?? []).map((product) => ({
          value: product.id,
          label: `${product.code} — ${product.name}`,
        }))}
        optionRender={(option) => {
          const product = (results.data ?? []).find(
            (item) => item.id === option.value,
          );
          if (!product) return option.label;
          return (
            <div className="flex flex-col">
              <span className="font-mono text-[13px]">{product.code}</span>
              <Typography.Text type="secondary" className="truncate text-xs">
                {product.name}
              </Typography.Text>
            </div>
          );
        }}
        onChange={(id) => {
          const product = (results.data ?? []).find((item) => item.id === id);
          if (product) onSelect(product);
          setQuery("");
        }}
      />
    </div>
  );
}
