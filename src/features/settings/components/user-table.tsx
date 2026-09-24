"use client";

import { App, Badge, Button, Dropdown, Segmented, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";

import { QueryState } from "@/shared/components/query-state";
import { ROLE_LABELS } from "@/shared/lib/permissions";

import { setUserActive } from "../actions/user.actions";
import {
  userListKey,
  userWarehouses,
  fetchUsers,
  type UserRow,
} from "../api/user.api";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserDrawer } from "./user-drawer";

type UserFilter = "dang" | "ngung" | "tat_ca";

export function UserTable({ currentUserId }: { currentUserId: string }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [, batDau] = useTransition();
  const users = useQuery({ queryKey: userListKey, queryFn: fetchUsers });

  const [filter, setFilter] = useState<UserFilter>("dang");
  const [drawer, setDrawer] = useState<{ mo: boolean; nd: UserRow | null }>({
    mo: false,
    nd: null,
  });
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);

  function toggleActive(nd: UserRow) {
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
            const kq = await setUserActive({ id: nd.id, isActive: batLai });
            if (!kq.ok) {
              message.error(kq.message);
            } else {
              message.success(batLai ? "Đã mở lại tài khoản" : "Đã vô hiệu hóa tài khoản");
              void queryClient.invalidateQueries({ queryKey: userListKey });
            }
            xong();
          });
        }),
    });
  }

  const columns: ColumnsType<UserRow> = [
    {
      title: "Họ tên",
      dataIndex: "ho_ten",
      width: 200,
      render: (ten: string, d) => (
        <Space size={6}>
          <span className="font-medium">{ten}</span>
          {d.id === currentUserId ? <Tag color="blue">Bạn</Tag> : null}
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
      render: (v: UserRow["vai_tro"]) => ROLE_LABELS[v],
    },
    {
      title: "Quyền riêng",
      key: "quyen_rieng",
      width: 160,
      render: (_, d) => {
        const laQuanLy = d.vai_tro === "quan_ly";
        const xemKiotViet = laQuanLy || d.xem_lich_su_kiotviet;
        const duyetKiemKe = laQuanLy || d.duyet_kiem_ke;
        if (!xemKiotViet && !duyetKiemKe) return <span className="text-gray-400">—</span>;
        return (
          <Space size={4} wrap>
            {xemKiotViet ? <Tag className="m-0">LS KiotViet</Tag> : null}
            {duyetKiemKe ? <Tag className="m-0">Duyệt KK</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: "Kho",
      key: "kho",
      width: 200,
      render: (_, d) =>
        d.vai_tro === "thu_kho" ? (
          <span className="flex flex-wrap gap-1">
            {userWarehouses(d).map((k) => (
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
      key: "status",
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
                key: "status",
                label: d.dang_hoat_dong ? "Vô hiệu hóa" : "Mở lại",
                danger: d.dang_hoat_dong,
              },
            ],
            onClick: ({ key }) => {
              if (key === "sua") setDrawer({ mo: true, nd: d });
              if (key === "mat_khau") setResetTarget(d);
              if (key === "status") toggleActive(d);
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
          value={filter}
          onChange={(v) => setFilter(v as UserFilter)}
          options={[
            { value: "dang", label: "Đang hoạt động" },
            { value: "ngung", label: "Đã vô hiệu hóa" },
            { value: "tat_ca", label: "Tất cả" },
          ]}
        />
        <Button
          type="primary"
          className="ms-auto"
          onClick={() => setDrawer({ mo: true, nd: null })}
        >
          Thêm tài khoản
        </Button>
      </div>

      <QueryState
        query={users}
        emptyDescription="Chưa có tài khoản nào khác. Bấm “Thêm tài khoản” để cấp cho nhân viên."
      >
        {(d) => {
          // Vài chục dòng — lọc ngay ở client, không cần thêm tham số server.
          const dong = d.filter(
            (n) =>
              filter === "tat_ca" ||
              (filter === "dang" ? n.dang_hoat_dong : !n.dang_hoat_dong),
          );

          return (
            <div className="overflow-x-auto">
              <Table<UserRow>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={dong}
                loading={users.isFetching}
                scroll={{ x: 900 }}
                pagination={false}
                locale={{ emptyText: "Không có tài khoản nào ở trạng thái này." }}
              />
            </div>
          );
        }}
      </QueryState>

      <UserDrawer
        open={drawer.mo}
        user={drawer.nd}
        onClose={() => setDrawer((s) => ({ ...s, mo: false }))}
      />

      <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
    </>
  );
}
