"use client";

import { App, Collapse, Modal, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { removeDiacritics } from "@/shared/lib/text";
import { explainError } from "@/shared/lib/errors";

import { useApDungGoiY, useGoiYCongDoan } from "../hooks/useSanPham";
import type { GoiYCongDoan as DongGoiY } from "../types";

/**
 * Tên hàng chứa từ của một công đoạn KHÁC công đoạn đang đề xuất → nhiều khả
 * năng đuôi mã nói một đằng, tên nói một nẻo. Không tự loại, chỉ bỏ tick sẵn.
 */
const TU_CONG_DOAN: Record<string, string[]> = {
  CARBON: ["carbon", "cb"],
  XI_MA: ["xi ma", "xima", "xi"],
  SON: ["son"],
  NANO: ["nano"],
};

function canKiemTra(d: DongGoiY): boolean {
  const ten = removeDiacritics(d.ten_hang).toLowerCase();

  return Object.entries(TU_CONG_DOAN).some(
    ([ma, tu]) => ma !== d.ma_cong_doan_de_xuat && tu.some((t) => ten.includes(t)),
  );
}

type Props = { open: boolean; onClose: () => void };

export function GoiYCongDoan({ open, onClose }: Props) {
  const { message } = App.useApp();
  const goiY = useGoiYCongDoan(open);
  const apDung = useApDungGoiY();
  const [boTick, setBoTick] = useState<Set<string>>(new Set());

  const nhom = useMemo(() => {
    const theoCongDoan = new Map<string, DongGoiY[]>();
    for (const d of goiY.data ?? []) {
      const cu = theoCongDoan.get(d.ten_cong_doan_de_xuat);
      if (cu) cu.push(d);
      else theoCongDoan.set(d.ten_cong_doan_de_xuat, [d]);
    }
    return [...theoCongDoan.entries()];
  }, [goiY.data]);

  // Mặc định chọn hết, trừ những mã bị đánh dấu "Kiểm tra".
  const macDinhBo = useMemo(
    () => new Set((goiY.data ?? []).filter(canKiemTra).map((d) => d.id)),
    [goiY.data],
  );

  const daBo = boTick.size > 0 || macDinhBo.size === 0 ? boTick : macDinhBo;
  const daChon = (goiY.data ?? []).filter((d) => !daBo.has(d.id)).map((d) => d.id);

  function doiTick(ids: string[], cacDong: DongGoiY[]) {
    const moi = new Set(daBo);
    for (const d of cacDong) {
      if (ids.includes(d.id)) moi.delete(d.id);
      else moi.add(d.id);
    }
    setBoTick(moi);
  }

  async function ap() {
    try {
      const so = await apDung.mutateAsync(daChon);
      message.success(
        so === daChon.length
          ? `Đã gán công đoạn cho ${so} mã`
          : `Đã gán công đoạn cho ${so}/${daChon.length} mã — số còn lại vừa được người khác sửa.`,
      );
      setBoTick(new Set());
      onClose();
    } catch (e) {
      const loi = explainError(e);
      message.error(`${loi.title}. ${loi.action}`);
    }
  }

  const cot: ColumnsType<DongGoiY> = [
    { title: "Mã hàng", dataIndex: "ma_hang", width: 170 },
    {
      title: "Tên hàng",
      dataIndex: "ten_hang",
      ellipsis: true,
      render: (ten: string, d) =>
        canKiemTra(d) ? (
          <span className="flex items-center gap-2">
            <span className="truncate">{ten}</span>
            <Tooltip title="Tên hàng nhắc tới công đoạn khác với đuôi mã — xem kỹ trước khi gán.">
              <Tag color="orange">Kiểm tra</Tag>
            </Tooltip>
          </span>
        ) : (
          ten
        ),
    },
    { title: "Nhóm hàng", dataIndex: "ten_nhom_hang", width: 180, ellipsis: true },
  ];

  return (
    <Modal
      open={open}
      title="Gợi ý công đoạn theo đuôi mã"
      width={900}
      okText={`Áp dụng cho ${daChon.length} mã đã chọn`}
      okButtonProps={{ disabled: daChon.length === 0, loading: apDung.isPending }}
      cancelText="Đóng"
      onOk={() => void ap()}
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary">
        Quy ước đuôi mã đã kiểm trên 1.441 mã: <code>-CB</code> → Carbon (97%),{" "}
        <code>-X</code> → Xi mạ (95%), <code>-S…</code> → Sơn (94%), <code>-N</code> → Nano.
        Bỏ tick những mã bạn thấy sai.
      </Typography.Paragraph>

      <QueryState
        query={goiY}
        emptyDescription="Không còn mã mua ngoài nào có đuôi -CB / -X / -S / -N."
      >
        {() => (
          <Collapse
            defaultActiveKey={nhom.map(([ten]) => ten)}
            items={nhom.map(([ten, dong]) => ({
              key: ten,
              label: `${ten} · ${dong.length} mã`,
              children: (
                <Table<DongGoiY>
                  rowKey="id"
                  size="small"
                  columns={cot}
                  dataSource={dong}
                  pagination={false}
                  scroll={{ y: 260 }}
                  rowSelection={{
                    selectedRowKeys: dong.filter((d) => !daBo.has(d.id)).map((d) => d.id),
                    onChange: (keys) => doiTick(keys as string[], dong),
                    preserveSelectedRowKeys: true,
                  }}
                />
              ),
            }))}
          />
        )}
      </QueryState>
    </Modal>
  );
}
