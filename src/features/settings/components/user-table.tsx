"use client";

import { App, Button, Dropdown, Segmented, Space, Switch, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";

import { QueryState } from "@/shared/components/query-state";
import { BUSINESS_PERMISSIONS } from "@/shared/lib/permissions";

import { setUserActive } from "../actions/user.actions";
import {
  userListKey,
  userWarehouses,
  fetchUsers,
  type UserRow,
} from "../api/user.api";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserDrawer, type AccountAccess } from "./user-drawer";

type UserFilter = "dang" | "ngung" | "tat_ca";

const PERMISSION_LABEL = new Map(BUSINESS_PERMISSIONS.map((p) => [p.key, p.label]));

export function UserTable({ currentUserId, access }: { currentUserId: string; access: AccountAccess }) {
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
          {d.id === currentUserId ? <Tag>Bạn</Tag> : null}
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
      title: "Loại",
      key: "loai",
      width: 130,
      render: (_, d) => (d.vai_tro === "quan_ly" ? "Quản lý/Admin" : "Nhân viên"),
    },
    {
      title: "Quyền",
      key: "quyen",
      width: 280,
      render: (_, d) => {
        if (d.vai_tro === "quan_ly") return <Tag color="blue" className="m-0">Đủ mọi quyền</Tag>;
        if (d.permissions.length === 0) return <span className="text-gray-400">Chưa có quyền</span>;
        return (
          <span className="flex flex-wrap gap-1">
            {d.permissions.map((k) => (
              <Tag key={k} className="m-0">
                {PERMISSION_LABEL.get(k) ?? k}
              </Tag>
            ))}
          </span>
        );
      },
    },
    {
      title: "Kho",
      key: "kho",
      width: 160,
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
      title: "Hoạt động",
      key: "status",
      width: 230,
      render: (_, d) => {
        // Cùng điều kiện với menu thao tác: cần quyền Tạo tài khoản; tài khoản Admin chỉ Admin bật/tắt.
        const locked = !access.canProfile || (d.vai_tro === "quan_ly" && !access.isAdmin);
        return (
          <Space size={8} wrap>
            <Tooltip title={locked ? "Cần quyền Tạo tài khoản để bật/tắt" : undefined}>
              <Switch
                checked={d.dang_hoat_dong}
                disabled={locked}
                aria-label={d.dang_hoat_dong ? `Vô hiệu hóa ${d.ho_ten}` : `Mở lại ${d.ho_ten}`}
                // Không đổi ngay: hỏi xác nhận trước, bảng tự cập nhật sau khi lưu xong.
                onClick={() => toggleActive(d)}
              />
            </Tooltip>
            {d.phai_doi_mat_khau ? <Tag color="orange" className="m-0">Chờ đổi mật khẩu</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: "",
      key: "thao_tac",
      width: 60,
      align: "right",
      render: (_, d) => {
        // Tài khoản Admin chỉ Admin đụng được (0117) — người khác không thấy nút.
        if (d.vai_tro === "quan_ly" && !access.isAdmin) return null;
        return (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: access.canProfile
              ? [
                  { key: "sua", label: "Sửa" },
                  { key: "mat_khau", label: "Đặt lại mật khẩu" },
                ]
              : [{ key: "sua", label: "Phân quyền" }],
            onClick: ({ key }) => {
              if (key === "sua") setDrawer({ mo: true, nd: d });
              if (key === "mat_khau") setResetTarget(d);
            },
          }}
        >
          <Button type="text" size="small">
            ⋯
          </Button>
        </Dropdown>
        );
      },
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
        {access.canProfile ? (
          <Button
            type="primary"
            className="ms-auto"
            onClick={() => setDrawer({ mo: true, nd: null })}
          >
            Thêm tài khoản
          </Button>
        ) : null}
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
            <div className="overflow-x-auto rounded-the border border-vien bg-white">
              <Table<UserRow>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={dong}
                loading={users.isFetching}
                scroll={{ x: 1150 }}
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
        access={access}
      />

      <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
    </>
  );
}
