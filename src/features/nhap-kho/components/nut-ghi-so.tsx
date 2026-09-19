"use client";

import { App, Button, Tooltip } from "antd";

import { explainError, isPostgrestError, errorCode } from "@/shared/lib/errors";

import { useGhiSo } from "../hooks/usePhieuNhap";
import type { ChiTietPhieu, DongPhieu } from "../types";
import { TomTatGhiSo } from "./tom-tat-ghi-so";

type Props = { phieu: ChiTietPhieu; dong: DongPhieu[]; coQuyenSua: boolean };

export function NutGhiSo({ phieu, dong, coQuyenSua }: Props) {
  const { message, modal } = App.useApp();
  const ghiSo = useGhiSo(phieu.id);

  if (phieu.trang_thai !== "NHAP_LIEU" || !coQuyenSua) return null;

  const thieuGia = dong.filter((d) => Number(d.don_gia) <= 0);

  // D-04: ghi sổ bắt buộc mọi dòng có đơn giá > 0 — chặn sớm ở đây để người
  // dùng không phải đợi round-trip mới biết.
  const lyDoKhoa =
    dong.length === 0
      ? "Phiếu chưa có dòng nào."
      : thieuGia.length > 0
        ? `Còn ${thieuGia.length} dòng chưa có đơn giá: ${thieuGia
            .slice(0, 3)
            .map((d) => d.ma_hang)
            .join(", ")}${thieuGia.length > 3 ? "…" : ""}`
        : null;

  function hoiRoiGhi() {
    modal.confirm({
      title: "Ghi sổ phiếu nhập?",
      width: 560,
      content: <TomTatGhiSo phieu={phieu} dong={dong} />,
      okText: "Ghi sổ",
      cancelText: "Xem lại",
      onOk: async () => {
        try {
          await ghiSo.mutateAsync();
          message.success(`Đã ghi sổ phiếu ${phieu.so_ct}`);
        } catch (e) {
          // RPC soạn sẵn câu tiếng Việt cho ca nghiệp vụ (thiếu dòng, sai
          // trạng thái, xuất quá tồn) — hiện nguyên văn, đừng dịch lại.
          if (isPostgrestError(e) && e.code === "23514") {
            message.error(e.message);
            return;
          }
          if (errorCode(e) === "42501") {
            message.error("Tài khoản không có quyền ghi sổ chứng từ.");
            return;
          }
          const l = explainError(e);
          message.error(`${l.title}. ${l.action}`);
        }
      },
    });
  }

  return (
    <Tooltip title={lyDoKhoa ?? ""}>
      <Button
        type="primary"
        disabled={Boolean(lyDoKhoa)}
        loading={ghiSo.isPending}
        onClick={hoiRoiGhi}
      >
        Ghi sổ
      </Button>
    </Tooltip>
  );
}
