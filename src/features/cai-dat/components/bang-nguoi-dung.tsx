"use client";

import { App, Badge, Button, Dropdown, Segmented, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";

import { QueryState } from "@/shared/components/query-state";
import { NHAN_VAI_TRO } from "@/shared/lib/quyen";

import { doiTrangThaiNguoiDung } from "../actions/nguoi-dung.actions";
import {
  khoaNguoiDung,
  khoCuaNguoiDung,
  layDanhSachNguoiDung,
  type DongNguoiDung,
} from "../api/nguoi-dung.api";
import { HopDatLaiMatKhau } from "./hop-dat-lai-mat-khau";
import { NganKeoNguoiDung } from "./ngan-keo-nguoi-dung";

type Loc = "dang" | "ngung" | "tat_ca";

export function BangNguoiDung({ nguoiDungHienTaiId }: { nguoiDungHienTaiId: string }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [, batDau] = useTransition();
  const danhSach = useQuery({ queryKey: khoaNguoiDung, queryFn: layDanhSachNguoiDung });

  const [loc, setLoc] = useState<Loc>("dang");
  const [nganKeo, setNganKeo] = useState<{ mo: boolean; nd: DongNguoiDung | null }>({
    mo: false,
    nd: null,
  });
  const [datLai, setDatLai] = useState<DongNguoiDung | null>(null);

  function doiTrangThai(nd: DongNguoiDung) {
    const batLai = !nd.dang_hoat_dong;

    modal.confirm({
      title: batLai ? `Mở lại tài khoản ${nd.ho_ten}?` : `Vô hiệu hóa ${nd.ho_ten}?`,
      content: batLai
        ? "Nhân viên đăng nhập lại được bằng mật khẩu cũ."
        : "Nhân viên sẽ bị đăng xuất và không đăng nhập lại được cho tới khi mở lại. Thao tác đang dở của họ có thể bị từ chối.",
      okText: batLai ? "Mở lại" : "Vô hiệu hóa",
      okButtonProps: batLai ? undefined : { danger: true },
      cancelText: "Thôi",
      onOk: () =>
        new Promise<void>((xong) => {
          batDau(async () => {
            const kq = await doiTrangThaiNguoiDung({ id: nd.id, dangHoatDong: batLai });
            if (!kq.ok) {
              message.error(kq.thongBao);
            } else {
              message.success(batLai ? "Đã mở lại tài khoản" : "Đã vô hiệu hóa tài khoản");
              void queryClient.invalidateQueries({ queryKey: khoaNguoiDung });
            }
            xong();
          });
        }),
    });
  }

  const cot: ColumnsType<DongNguoiDung> = [
    {
      title: "Họ tên",
      dataIndex: "ho_ten",
      width: 200,
      render: (ten: string, d) => (
        <Space size={6}>
          <span className="font-medium">{ten}</span>
          {d.id === nguoiDungHienTaiId ? <Tag color="blue">Bạn</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "ten_dang_nhap",
      width: 150,
      render: (v: string | null) => <span className="font-mono">{v ?? "—"}</span>,
    },
    {
      title: "Vai trò",
      dataIndex: "vai_tro",
      width: 120,
      render: (v: DongNguoiDung["vai_tro"]) => NHAN_VAI_TRO[v],
    },
    {
      title: "Kho",
      key: "kho",
      width: 200,
      render: (_, d) =>
        d.vai_tro === "thu_kho" ? (
          <span className="flex flex-wrap gap-1">
            {khoCuaNguoiDung(d).map((k) => (
              <Tag key={k.id} className="m-0">
                {k.ten}
              </Tag>
            ))}
          </span>
        ) : (
          <span className="text-gray-400">Tất cả kho</span>
        ),
    },
    {
      title: "Trạng thái",
      key: "trang_thai",
      width: 220,
      render: (_, d) => (
        <Space size={6}>
          <Badge
            status={d.dang_hoat_dong ? "success" : "default"}
            text={d.dang_hoat_dong ? "Đang hoạt động" : "Đã vô hiệu hóa"}
          />
          {d.phai_doi_mat_khau ? <Tag color="orange">Chờ đổi mật khẩu</Tag> : null}
        </Space>
      ),
    },
    {
      title: "",
      key: "thao_tac",
      width: 60,
      align: "right",
      render: (_, d) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "sua", label: "Sửa" },
              { key: "mat_khau", label: "Đặt lại mật khẩu" },
              { type: "divider" as const },
              {
                key: "trang_thai",
                label: d.dang_hoat_dong ? "Vô hiệu hóa" : "Mở lại",
                danger: d.dang_hoat_dong,
              },
            ],
            onClick: ({ key }) => {
              if (key === "sua") setNganKeo({ mo: true, nd: d });
              if (key === "mat_khau") setDatLai(d);
              if (key === "trang_thai") doiTrangThai(d);
            },
          }}
        >
          <Button type="text" size="small">
            ⋯
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented
          value={loc}
          onChange={(v) => setLoc(v as Loc)}
          options={[
            { value: "dang", label: "Đang hoạt động" },
            { value: "ngung", label: "Đã vô hiệu hóa" },
            { value: "tat_ca", label: "Tất cả" },
          ]}
        />
        <Button
          type="primary"
          className="ms-auto"
          onClick={() => setNganKeo({ mo: true, nd: null })}
        >
          Thêm tài khoản
        </Button>
      </div>

      <QueryState
        query={danhSach}
        moTaRong="Chưa có tài khoản nào khác. Bấm “Thêm tài khoản” để cấp cho nhân viên."
      >
        {(d) => {
          // Vài chục dòng — lọc ngay ở client, không cần thêm tham số server.
          const dong = d.filter(
            (n) =>
              loc === "tat_ca" ||
              (loc === "dang" ? n.dang_hoat_dong : !n.dang_hoat_dong),
          );

          return (
            <div className="overflow-x-auto">
              <Table<DongNguoiDung>
                rowKey="id"
                size="small"
                columns={cot}
                dataSource={dong}
                loading={danhSach.isFetching}
                scroll={{ x: 900 }}
                pagination={false}
                locale={{ emptyText: "Không có tài khoản nào ở trạng thái này." }}
              />
            </div>
          );
        }}
      </QueryState>

      <NganKeoNguoiDung
        open={nganKeo.mo}
        nguoiDung={nganKeo.nd}
        onDong={() => setNganKeo((s) => ({ ...s, mo: false }))}
      />

      <HopDatLaiMatKhau nguoiDung={datLai} onDong={() => setDatLai(null)} />
    </>
  );
}
