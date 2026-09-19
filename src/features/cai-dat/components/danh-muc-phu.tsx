"use client";

import { App, Button, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { explainError, isPostgrestError, errorCode } from "@/shared/lib/errors";

import {
  CAU_HINH_DANH_MUC_PHU,
  laMaHeThong,
  type BangDanhMucPhu,
  type LookupItem,
} from "../api/danh-muc-phu.api";
import { useLookups, useXoaDanhMucPhu } from "../hooks/useLookups";
import { NganKeoDanhMucPhu } from "./ngan-keo-danh-muc-phu";

export function Lookups({ table }: { table: BangDanhMucPhu }) {
  const { message } = App.useApp();
  const cauHinh = CAU_HINH_DANH_MUC_PHU[table];
  const danhSach = useLookups(table);
  const xoa = useXoaDanhMucPhu(table);
  const [nganKeo, setNganKeo] = useState<{ mo: boolean; muc: LookupItem | null }>({
    mo: false,
    muc: null,
  });

  const dong = useMemo(() => danhSach.data ?? [], [danhSach.data]);
  const tenTheoId = useMemo(
    () => new Map(dong.map((d) => [d.id, `${d.ma} — ${d.ten}`])),
    [dong],
  );

  async function xoaMuc(muc: LookupItem) {
    try {
      await xoa.mutateAsync(muc.id);
      message.success(`Đã xóa ${cauHinh.label} ${muc.ma}`);
    } catch (e) {
      if (errorCode(e) === "23503") {
        message.error(
          `Đang có mã hàng dùng ${cauHinh.label} này — đổi các mã đó sang ${cauHinh.label} khác trước khi xóa.`,
        );
        return;
      }
      // 23514 là mã hệ thống bị trigger 0040 chặn — câu tiếng Việt do chính
      // migration soạn, hiện nguyên văn.
      if (isPostgrestError(e) && e.code === "23514") {
        message.error(e.message);
        return;
      }
      const loi = explainError(e);
      message.error(`${loi.title}. ${loi.action}`);
    }
  }

  const cot: ColumnsType<LookupItem> = [
    {
      title: "Mã",
      dataIndex: "ma",
      width: 180,
      render: (ma: string) => (
        <Space size={6}>
          <span className="font-medium">{ma}</span>
          {laMaHeThong(table, ma) ? <Tag color="gold">Hệ thống</Tag> : null}
        </Space>
      ),
    },
    { title: "Tên", dataIndex: "ten", ellipsis: true },
    ...(cauHinh.coCha
      ? [
          {
            title: "Nhóm cha",
            dataIndex: "parent_id",
            width: 240,
            render: (id: string | null) =>
              id ? (tenTheoId.get(id) ?? "(nhóm đã xóa)") : <span className="text-gray-400">—</span>,
          },
        ]
      : []),
    ...(cauHinh.coMau
      ? [
          {
            title: "Màu",
            dataIndex: "mau_hien_thi",
            width: 120,
            render: (mau: string | null) =>
              mau ? <Tag color={mau}>{mau}</Tag> : <span className="text-gray-400">—</span>,
          },
        ]
      : []),
    ...(cauHinh.coDiaChi
      ? [{ title: "Địa chỉ", dataIndex: "dia_chi", ellipsis: true }]
      : []),
    ...(cauHinh.coTrangThai
      ? [
          {
            title: "Trạng thái",
            dataIndex: "dang_hoat_dong",
            width: 120,
            render: (hd: boolean) =>
              hd ? <Tag color="green">Đang dùng</Tag> : <Tag>Ngừng</Tag>,
          },
        ]
      : []),
    {
      title: "",
      key: "thao_tac",
      width: 130,
      align: "right",
      render: (_: unknown, d: LookupItem) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            className="px-0"
            onClick={() => setNganKeo({ mo: true, muc: d })}
          >
            Sửa
          </Button>
          {cauHinh.xoaDuoc && !laMaHeThong(table, d.ma) ? (
            <Popconfirm
              title={`Xóa ${cauHinh.label} “${d.ten}”?`}
              description="Không khôi phục được. Mã hàng đang dùng sẽ chặn xóa."
              okText="Xóa"
              okButtonProps={{ danger: true, loading: xoa.isPending }}
              cancelText="Thôi"
              onConfirm={() => void xoaMuc(d)}
            >
              <Button type="link" size="small" danger className="px-0">
                Xóa
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button type="primary" onClick={() => setNganKeo({ mo: true, muc: null })}>
          Thêm {cauHinh.label}
        </Button>
      </div>

      <QueryState
        query={danhSach}
        emptyDescription={`Chưa có ${cauHinh.label} nào. Bấm “Thêm ${cauHinh.label}” để tạo.`}
      >
        {(d) => (
          <div className="overflow-x-auto">
            <Table<LookupItem>
              rowKey="id"
              size="small"
              columns={cot}
              dataSource={d}
              loading={danhSach.isFetching}
              scroll={{ x: 720 }}
              pagination={false}
            />
          </div>
        )}
      </QueryState>

      <NganKeoDanhMucPhu
        table={table}
        muc={nganKeo.muc}
        open={nganKeo.mo}
        danhSach={dong}
        onClose={() => setNganKeo((s) => ({ ...s, mo: false }))}
      />
    </>
  );
}
