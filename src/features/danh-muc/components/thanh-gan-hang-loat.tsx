"use client";

import { App, Button, Dropdown, Select, Space } from "antd";
import { useState } from "react";

import { dienGiaiLoi } from "@/shared/lib/errors";

import { useGanHangLoat, useXacNhanDaRa } from "../hooks/useSanPham";
import type { DanhMucPhu } from "../types";

const TOI_DA = 1000;

/**
 * Ô "Gán …": sau khi gán xong phải trở lại placeholder chứ không giữ giá trị vừa
 * chọn — nó là một HÀNH ĐỘNG, không phải một ô dữ liệu. Giữ state trong này để
 * thanh công cụ không phải nuôi ba state gần như giống nhau.
 */
function SelectGan({
  placeholder,
  className,
  tuyChon,
  disabled,
  onChon,
}: {
  placeholder: string;
  className: string;
  tuyChon: Array<{ value: string; label: string }>;
  disabled: boolean;
  onChon: (id: string, ten: string) => void;
}) {
  const [gt, setGt] = useState<string | undefined>(undefined);

  return (
    <Select
      showSearch
      optionFilterProp="label"
      className={className}
      placeholder={placeholder}
      value={gt}
      disabled={disabled}
      options={tuyChon}
      onChange={(v) => {
        setGt(undefined);
        onChon(v, tuyChon.find((t) => t.value === v)?.label ?? "");
      }}
    />
  );
}

type Props = {
  ids: string[];
  danhMucPhu: DanhMucPhu | undefined;
  onXong: () => void;
};

export function ThanhGanHangLoat({ ids, danhMucPhu, onXong }: Props) {
  const { message, modal } = App.useApp();
  const gan = useGanHangLoat();
  const xacNhan = useXacNhanDaRa();
  const [dangChay, setDangChay] = useState(false);

  if (ids.length === 0) return null;

  function hoiRoiChay(moTa: string, chay: () => Promise<number>) {
    if (ids.length > TOI_DA) {
      message.warning(`Chọn tối đa ${TOI_DA} mã mỗi lần.`);
      return;
    }

    modal.confirm({
      title: `${moTa} cho ${ids.length} mã?`,
      content:
        ids.length > 20
          ? "Thao tác ghi vào nhật ký sửa của từng mã."
          : undefined,
      okText: "Làm",
      cancelText: "Thôi",
      onOk: async () => {
        setDangChay(true);
        try {
          const so = await chay();
          message.success(`Đã cập nhật ${so} mã`);
          onXong();
        } catch (e) {
          const loi = dienGiaiLoi(e);
          message.error(`${loi.tieuDe}. ${loi.huongXuLy}`);
        } finally {
          setDangChay(false);
        }
      },
    });
  }

  function ganTruong(
    truong: "cong_doan_id" | "nhom_hang_id" | "dvt_id",
    id: string,
    ten: string,
    nhan: string,
  ) {
    hoiRoiChay(`Gán ${nhan} “${ten}”`, () =>
      gan.mutateAsync({ ids, thayDoi: { [truong]: id || null }, nguon: "hang_loat" }),
    );
  }

  return (
    <div className="sticky top-0 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
      <strong>Đã chọn {ids.length} mã</strong>

      <SelectGan
        className="w-44"
        placeholder="Gán công đoạn"
        disabled={dangChay}
        tuyChon={(danhMucPhu?.congDoan ?? []).map((c) => ({ value: c.id, label: c.ten }))}
        onChon={(id, ten) => ganTruong("cong_doan_id", id, ten, "công đoạn")}
      />

      <SelectGan
        className="w-44"
        placeholder="Gán nhóm hàng"
        disabled={dangChay}
        tuyChon={(danhMucPhu?.nhomHang ?? []).map((n) => ({ value: n.id, label: n.ten }))}
        onChon={(id, ten) => ganTruong("nhom_hang_id", id, ten, "nhóm hàng")}
      />

      <SelectGan
        className="w-36"
        placeholder="Gán ĐVT"
        disabled={dangChay}
        tuyChon={(danhMucPhu?.donViTinh ?? []).map((d) => ({ value: d.id, label: d.ten }))}
        onChon={(id, ten) => ganTruong("dvt_id", id, ten, "đơn vị tính")}
      />

      <Dropdown
        trigger={["click"]}
        disabled={dangChay}
        menu={{
          items: [
            { key: "1", label: "Đang kinh doanh" },
            { key: "0", label: "Ngừng kinh doanh" },
          ],
          onClick: ({ key }) =>
            hoiRoiChay(
              key === "1" ? "Đặt lại Đang kinh doanh" : "Đặt Ngừng kinh doanh",
              () =>
                gan.mutateAsync({
                  ids,
                  thayDoi: { dang_kinh_doanh: key === "1" },
                  nguon: "hang_loat",
                }),
            ),
        }}
      >
        <Button>Trạng thái</Button>
      </Dropdown>

      <Space className="ms-auto">
        <Button
          disabled={dangChay}
          onClick={() =>
            hoiRoiChay("Xác nhận đã rà", () => xacNhan.mutateAsync(ids))
          }
        >
          Xác nhận đã rà
        </Button>
        <Button type="text" onClick={onXong}>
          Bỏ chọn
        </Button>
      </Space>
    </div>
  );
}
