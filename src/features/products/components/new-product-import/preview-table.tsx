"use client";

import { Input, Switch, Table, Tag, Tooltip } from "antd";
import type { TableColumnsType } from "antd";

import type { DraftFields, DraftRow } from "../../lib/new-product-import";
import type { Lookups } from "../../types";
import { LookupSelect } from "../lookup-select";
import { useStickyTableOffset } from "@/shared/hooks/use-sticky-table-offset";

type Props = {
  rows: DraftRow[];
  problems: Map<number, string[]>;
  lookups: Lookups | undefined;
  selected: number[];
  onSelect: (rows: number[]) => void;
  onChange: (row: number, patch: Partial<DraftFields>) => void;
};

const toOptions = (items: { id: string; name: string }[] | undefined) =>
  (items ?? []).map((item) => ({ value: item.id, label: item.name }));

/** Bảng xem trước đủ cột theo thứ tự IMP-02: cột từ file chỉ đọc, cột còn lại chọn tại chỗ. */
export function PreviewTable({ rows, problems, lookups, selected, onSelect, onChange }: Props) {
  const offsetHeader = useStickyTableOffset();
  const lookupColumn = (
    title: string,
    field: "productTypeId" | "categoryId" | "vehicleLineId" | "unitId",
    table: "loai_hang" | "nhom_hang" | "dong_xe" | "don_vi_tinh",
    label: string,
    items: { id: string; name: string }[] | undefined,
  ) => ({
    title,
    key: field,
    width: 170,
    render: (_: unknown, row: DraftRow) => (
      <LookupSelect
        table={table}
        label={label}
        allowClear={field !== "unitId"}
        placeholder="Chưa chọn"
        value={row[field]}
        onChange={(id) => onChange(row.row, { [field]: id })}
        options={toOptions(items)}
      />
    ),
  });

  const columns: TableColumnsType<DraftRow> = [
    {
      title: "Dòng",
      dataIndex: "row",
      width: 72,
      fixed: "left",
      render: (row: number) => {
        const list = problems.get(row);
        return list ? (
          <Tooltip title={list.join("; ")}>
            <Tag color="red" className="m-0">
              {row} · lỗi
            </Tag>
          </Tooltip>
        ) : (
          <span className="tabular-nums text-chu-phu">{row}</span>
        );
      },
    },
    lookupColumn("Loại hàng", "productTypeId", "loai_hang", "loại hàng", lookups?.productTypes),
    lookupColumn("Nhóm hàng", "categoryId", "nhom_hang", "nhóm hàng", lookups?.categories),
    { title: "Mã hàng", dataIndex: "code", width: 140, render: (code: string) => <span className="font-mono">{code || "—"}</span> },
    { title: "Tên hàng", dataIndex: "name", width: 240, ellipsis: true },
    lookupColumn("Dòng xe", "vehicleLineId", "dong_xe", "dòng xe", lookups?.vehicleLines),
    {
      title: "Tồn kho",
      dataIndex: "stock",
      width: 90,
      align: "right",
      className: "tabular-nums",
      render: (stock: number, row) => (row.fileProblems.length > 0 ? "—" : stock.toLocaleString("vi-VN")),
    },
    lookupColumn("ĐVT", "unitId", "don_vi_tinh", "đơn vị tính", lookups?.units),
    {
      title: "Đang KD",
      key: "isActive",
      width: 90,
      render: (_: unknown, row) => (
        <Switch size="small" checked={row.isActive} onChange={(isActive) => onChange(row.row, { isActive })} />
      ),
    },
    {
      title: "Bán trực tiếp",
      key: "directSale",
      width: 110,
      render: (_: unknown, row) => (
        <Switch size="small" checked={row.directSale} onChange={(directSale) => onChange(row.row, { directSale })} />
      ),
    },
    {
      title: "Vị trí",
      key: "shelfLocation",
      width: 120,
      render: (_: unknown, row) => (
        <Input
          size="small"
          value={row.shelfLocation}
          maxLength={50}
          onChange={(event) => onChange(row.row, { shelfLocation: event.target.value })}
        />
      ),
    },
    { title: "Mô tả", dataIndex: "description", width: 220, ellipsis: true },
  ];

  return (
    <Table<DraftRow>
      rowKey="row"
      size="small"
      sticky={{ offsetHeader }}
      columns={columns}
      dataSource={rows}
      scroll={{ x: 1700 }}
      rowClassName={(row) => (problems.has(row.row) ? "[&>td]:bg-red-50" : "")}
      rowSelection={{
        selectedRowKeys: selected,
        preserveSelectedRowKeys: true,
        onChange: (keys) => onSelect(keys as number[]),
      }}
      pagination={{ pageSize: 50, showSizeChanger: false, hideOnSinglePage: true }}
    />
  );
}
