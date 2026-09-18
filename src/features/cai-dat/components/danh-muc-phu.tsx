"use client";

import { App, Button, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PostgrestError } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { dienGiaiLoi } from "@/shared/lib/errors";

import {
  CAU_HINH_DANH_MUC_PHU,
  laMaHeThong,
  type BangDanhMucPhu,
  type MucDanhMucPhu,
} from "../api/danh-muc-phu.api";
import { useDanhMucPhu, useXoaDanhMucPhu } from "../hooks/useDanhMucPhu";
import { NganKeoDanhMucPhu } from "./ngan-keo-danh-muc-phu";

export function DanhMucPhu({ bang }: { bang: BangDanhMucPhu }) {
  const { message } = App.useApp();
  const cauHinh = CAU_HINH_DANH_MUC_PHU[bang];
  const danhSach = useDanhMucPhu(bang);
  const xoa = useXoaDanhMucPhu(bang);
  const [nganKeo, setNganKeo] = useState<{ mo: boolean; muc: MucDanhMucPhu | null }>({
    mo: false,
    muc: null,
  });

  const dong = useMemo(() => danhSach.data ?? [], [danhSach.data]);
  const tenTheoId = useMemo(
    () => new Map(dong.map((d) => [d.id, `${d.ma} — ${d.ten}`])),
    [dong],
  );

  async function xoaMuc(muc: MucDanhMucPhu) {
    try {
      await xoa.mutateAsync(muc.id);
      message.success(`Đã xóa ${cauHinh.nhan} ${muc.ma}`);
    } catch (e) {
      if (e instanceof PostgrestError && e.code === "23503") {
        message.error(
          `Đang có mã hàng dùng ${cauHinh.nhan} này — đổi các mã đó sang ${cauHinh.nhan} khác trước khi xóa.`,
        );
        return;
      }
      if (e instanceof PostgrestError && e.code === "23514") {
        message.error(e.message);
        return;
      }
      const loi = dienGiaiLoi(e);
      message.error(`${loi.tieuDe}. ${loi.huongXuLy}`);
    }
  }

  const cot: ColumnsType<MucDanhMucPhu> = [
    {
      title: "Mã",
      dataIndex: "ma",
      width: 180,
      render: (ma: string) => (
        <Space size={6}>
          <span className="font-medium">{ma}</span>
          {laMaHeThong(bang, ma) ? <Tag color="gold">Hệ thống</Tag> : null}
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
      render: (_: unknown, d: MucDanhMucPhu) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            className="px-0"
            onClick={() => setNganKeo({ mo: true, muc: d })}
          >
            Sửa
          </Button>
          {cauHinh.xoaDuoc && !laMaHeThong(bang, d.ma) ? (
            <Popconfirm
              title={`Xóa ${cauHinh.nhan} “${d.ten}”?`}
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
          Thêm {cauHinh.nhan}
        </Button>
      </div>

      <QueryState
        query={danhSach}
        moTaRong={`Chưa có ${cauHinh.nhan} nào. Bấm “Thêm ${cauHinh.nhan}” để tạo.`}
      >
        {(d) => (
          <div className="overflow-x-auto">
            <Table<MucDanhMucPhu>
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
        bang={bang}
        muc={nganKeo.muc}
        open={nganKeo.mo}
        danhSach={dong}
        onDong={() => setNganKeo((s) => ({ ...s, mo: false }))}
      />
    </>
  );
}
