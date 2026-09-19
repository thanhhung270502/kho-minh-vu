"use client";

import {
  App,
  Button,
  Dropdown,
  Grid,
  Input,
  Modal,
  Popover,
  Select,
  Space,
} from "antd";
import { useState } from "react";

import { explainError } from "@/shared/lib/errors";

import type { DongGhiChu, LoaiQuyet, QuyetDinh } from "../api/ra-ghi-chu.api";
import { useQuyetGhiChu, useTimKhach } from "../hooks/useRaGhiChu";
import { goiYTenKhach, rutGon, tachSoDienThoai } from "../lib/ghi-chu";

type Props = { dong: DongGhiChu };

/** Một ô chọn khách có sẵn, tìm server-side theo từ khóa đang gõ. */
function ChonKhach({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  const [q, setQ] = useState("");
  const khach = useTimKhach(q);

  return (
    <Select
      showSearch
      allowClear
      className="w-full"
      placeholder="Gõ tên khách để tìm"
      value={value}
      filterOption={false}
      loading={khach.isFetching}
      onSearch={setQ}
      onChange={(v) => onChange(v ?? undefined)}
      options={(khach.data ?? []).map((k) => ({
        value: k.id,
        label: `${k.ma} — ${k.ten}`,
      }))}
      notFoundContent={
        khach.isFetching ? "Đang tìm…" : "Không thấy khách nào khớp"
      }
    />
  );
}

export function HanhDongGhiChu({ dong }: Props) {
  const { message } = App.useApp();
  const quyet = useQuyetGhiChu();
  const manHinh = Grid.useBreakpoint();

  const [mo, setMo] = useState<LoaiQuyet | "GOP" | null>(null);
  const [ten, setTen] = useState(() => goiYTenKhach(dong.gia_tri));
  const [sdt, setSdt] = useState(() => tachSoDienThoai(dong.gia_tri) ?? "");
  const [tenSale, setTenSale] = useState(() => goiYTenKhach(dong.gia_tri));
  const [khachId, setKhachId] = useState<string | undefined>(undefined);

  async function luu(q: Omit<QuyetDinh, "giaTri">) {
    try {
      await quyet.mutateAsync({ ...q, giaTri: dong.gia_tri });
      message.success(`Đã lưu: ${rutGon(dong.gia_tri)}`);
      setMo(null);
    } catch (e) {
      const loi = explainError(e);
      message.error(`${loi.title}. ${loi.action}`);
    }
  }

  const saving = quyet.isPending;

  const noiDung: Record<LoaiQuyet, React.ReactNode> = {
    KHACH: (
      <div className="flex w-72 flex-col gap-2">
        <Input
          autoFocus
          value={ten}
          placeholder="Tên khách"
          onChange={(e) => setTen(e.target.value)}
          onPressEnter={() =>
            void luu({
              loai: "KHACH",
              taoKhach: { ten, dien_thoai: sdt || null },
            })
          }
        />
        <Input
          value={sdt}
          placeholder="Điện thoại (không bắt buộc)"
          onChange={(e) => setSdt(e.target.value)}
        />
        <Button
          type="primary"
          loading={saving}
          disabled={!ten.trim()}
          onClick={() =>
            void luu({
              loai: "KHACH",
              taoKhach: { ten, dien_thoai: sdt || null },
            })
          }
        >
          Tạo khách
        </Button>
      </div>
    ),
    SALE: (
      <div className="flex w-72 flex-col gap-2">
        <Input
          autoFocus
          value={tenSale}
          placeholder="Tên người bán"
          onChange={(e) => setTenSale(e.target.value)}
          onPressEnter={() => void luu({ loai: "SALE", tenSale })}
        />
        <Button
          type="primary"
          loading={saving}
          disabled={!tenSale.trim()}
          onClick={() => void luu({ loai: "SALE", tenSale })}
        >
          Lưu là sale
        </Button>
      </div>
    ),
    KHACH_VA_SALE: (
      <div className="flex w-80 flex-col gap-2">
        <span className="text-xs text-gray-500">
          Vừa là khách vừa là người bán — chọn khách có sẵn hoặc để trống để tạo
          mới theo tên bên dưới.
        </span>
        <ChonKhach value={khachId} onChange={setKhachId} />
        <Input
          value={ten}
          placeholder="Tên khách (nếu tạo mới)"
          onChange={(e) => setTen(e.target.value)}
        />
        <Input
          value={tenSale}
          placeholder="Tên người bán"
          onChange={(e) => setTenSale(e.target.value)}
        />
        <Button
          type="primary"
          loading={saving}
          disabled={!tenSale.trim() || (!khachId && !ten.trim())}
          onClick={() =>
            void luu({
              loai: "KHACH_VA_SALE",
              doiTacId: khachId,
              taoKhach: khachId ? undefined : { ten, dien_thoai: sdt || null },
              tenSale,
            })
          }
        >
          Lưu
        </Button>
      </div>
    ),
    BO_QUA: null,
  };

  const actions: Array<{ loai: LoaiQuyet; label: string }> = [
    { loai: "KHACH", label: "Tạo khách" },
    { loai: "SALE", label: "Là sale" },
    { loai: "KHACH_VA_SALE", label: "Khách + sale" },
  ];

  // "Gộp vào khách" tách riêng vì nội dung popover chỉ có ô chọn.
  const gop = (
    <div className="flex w-72 flex-col gap-2">
      <ChonKhach value={khachId} onChange={setKhachId} />
      <Button
        type="primary"
        loading={saving}
        disabled={!khachId}
        onClick={() => void luu({ loai: "KHACH", doiTacId: khachId })}
      >
        Gộp vào khách này
      </Button>
    </div>
  );

  const NHAN: Record<LoaiQuyet | "GOP", string> = {
    KHACH: "Tạo khách",
    SALE: "Là sale",
    KHACH_VA_SALE: "Khách + sale",
    GOP: "Gộp vào khách có sẵn",
    BO_QUA: "Bỏ qua",
  };

  if (!manHinh.md) {
    // Trên điện thoại không đủ chỗ cho 5 nút — gom vào menu, nội dung form mở
    // trong Modal (Popover neo theo nút sẽ tràn màn hình).
    return (
      <>
        <Modal
          open={mo !== null && mo !== "BO_QUA"}
          title={mo ? NHAN[mo] : ""}
          footer={null}
          onCancel={() => setMo(null)}
        >
          {mo === "GOP" ? gop : mo ? noiDung[mo] : null}
        </Modal>

        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              ...actions.map((h) => ({ key: h.loai, label: h.label })),
              { key: "GOP", label: "Gộp vào khách có sẵn" },
              { type: "divider" as const },
              { key: "BO_QUA", label: "Bỏ qua" },
            ],
            onClick: ({ key }) => {
              if (key === "BO_QUA") {
                void luu({ loai: "BO_QUA" });
                return;
              }
              setMo(key as LoaiQuyet | "GOP");
            },
          }}
        >
          <Button size="small">Quyết định…</Button>
        </Dropdown>
      </>
    );
  }

  return (
    <Space size={4} wrap>
      {actions.map((h) => (
        <Popover
          key={h.loai}
          open={mo === h.loai}
          trigger="click"
          placement="bottomRight"
          content={noiDung[h.loai]}
          onOpenChange={(v) => setMo(v ? h.loai : null)}
        >
          <Button size="small" disabled={saving && mo !== h.loai}>
            {h.label}
          </Button>
        </Popover>
      ))}

      <Popover
        open={mo === "GOP"}
        trigger="click"
        placement="bottomRight"
        content={gop}
        onOpenChange={(v) => setMo(v ? "GOP" : null)}
      >
        <Button size="small" disabled={saving}>
          Gộp
        </Button>
      </Popover>

      <Button
        size="small"
        loading={saving}
        onClick={() => void luu({ loai: "BO_QUA" })}
      >
        Bỏ qua
      </Button>
    </Space>
  );
}
