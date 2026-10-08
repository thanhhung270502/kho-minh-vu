"use client";

import { useQuery } from "@tanstack/react-query";
import { Select, Typography } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { useRef, useState, type Ref } from "react";

import {
  productSearchKeys,
  searchProducts,
  type ProductSearchResult,
} from "@/shared/api/product-search.api";

export type { ProductSearchResult };

type Props = {
  onSelect: (product: ProductSearchResult) => void;
  /**
   * Mã vừa chọn, đang chờ nhập số lượng. Ô phải hiện nó ra — nếu không người
   * nhập không biết Enter đã chọn mã nào (lỗi 02/10: ô trắng trơn sau Enter).
   * Cha xóa về null sau khi lưu dòng, ô trống lại cho mã kế tiếp.
   */
  selected?: ProductSearchResult | null;
  inputRef?: Ref<RefSelectProps>;
  disabled?: boolean;
};

/**
 * Ô gõ mã hàng của bảng dòng. Chọn xong tự xóa ô để gõ mã kế tiếp — luồng nhập
 * liệu là gõ liên tục, không phải chọn từng cái rồi bấm chuột (D-07).
 */
export function ProductSearchInput({ onSelect, selected, inputRef, disabled }: Props) {
  const [query, setQuery] = useState("");
  // Dòng đang tô trong danh sách (rc-select báo qua onActive) và việc người dùng
  // đã tự đi tới nó bằng ↑/↓ chưa. Ref, không phải state: chỉ đọc lúc bấm Enter.
  const activeId = useRef<string | null>(null);
  const navigated = useRef(false);

  function search(next: string) {
    // Gõ thêm chữ là danh sách mới — quay về luật "mã khớp đúng, không thì dòng đầu".
    navigated.current = false;
    setQuery(next);
  }

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
    // Ngoại lệ: người dùng đã dùng ↑/↓ chọn một dòng thì Enter lấy ĐÚNG dòng đó.
    const picked = navigated.current ? items.find((item) => item.id === activeId.current) : undefined;
    const normalized = query.trim().toLowerCase();
    const exactMatch = items.find(
      (item) => item.code.toLowerCase() === normalized,
    );

    onSelect(picked ?? exactMatch ?? items[0]);
    navigated.current = false;
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
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          navigated.current = true;
          return;
        }
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
        // labelInValue: hiện "mã — tên" của mã đã chọn mà không cần nó nằm
        // trong `options` (kết quả tìm đã bị xóa cùng ô tìm).
        labelInValue
        value={
          selected
            ? { value: selected.id, label: `${selected.code} — ${selected.name}` }
            : null
        }
        // `searchValue` phải controlled thì mới xóa được ô sau khi TỰ chọn bằng
        // Enter (đường onChange của antd không chạy trong nhánh đó).
        searchValue={query}
        disabled={disabled}
        className="w-full min-w-56"
        placeholder="Gõ mã hoặc tên hàng"
        filterOption={false}
        loading={results.isFetching}
        onSearch={search}
        onActive={(id) => {
          activeId.current = typeof id === "string" ? id : null;
        }}
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
              <span className="font-mono text-[15px]">{product.code}</span>
              <Typography.Text type="secondary" className="truncate text-xs">
                {product.name}
              </Typography.Text>
            </div>
          );
        }}
        onChange={(picked) => {
          const product = (results.data ?? []).find(
            (item) => item.id === picked?.value,
          );
          if (product) onSelect(product);
          navigated.current = false;
          setQuery("");
        }}
      />
    </div>
  );
}
