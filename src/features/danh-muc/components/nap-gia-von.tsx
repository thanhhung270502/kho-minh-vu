"use client";

import { Alert, Button, Modal, Statistic, Steps, Table, Typography, Upload } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useReducer } from "react";

import { khoaSanPham } from "../api/san-pham.keys";
import { GIOI_HAN_FILE_MB } from "../lib/mau-excel";
import type { KetQuaGiaVon } from "../lib/mau-gia-von";

type TrangThai = {
  buoc: 0 | 1 | 2;
  file: File | null;
  ketQua: KetQuaGiaVon | null;
  loi: { tieuDe: string; huongXuLy: string } | null;
  dangGui: boolean;
};

type HanhDong =
  | { kieu: "chon_file"; file: File }
  | { kieu: "dang_gui" }
  | { kieu: "xem_truoc"; ketQua: KetQuaGiaVon }
  | { kieu: "da_nap"; ketQua: KetQuaGiaVon }
  | { kieu: "loi"; tieuDe: string; huongXuLy: string }
  | { kieu: "lam_lai" };

const BAN_DAU: TrangThai = { buoc: 0, file: null, ketQua: null, loi: null, dangGui: false };

function rut(t: TrangThai, h: HanhDong): TrangThai {
  switch (h.kieu) {
    case "chon_file":
      return { ...BAN_DAU, file: h.file, dangGui: true };
    case "dang_gui":
      return { ...t, dangGui: true, loi: null };
    case "xem_truoc":
      return { ...t, buoc: 1, ketQua: h.ketQua, dangGui: false, loi: null };
    case "da_nap":
      return { ...t, buoc: 2, ketQua: h.ketQua, dangGui: false, loi: null };
    case "loi":
      return { ...t, dangGui: false, loi: { tieuDe: h.tieuDe, huongXuLy: h.huongXuLy } };
    case "lam_lai":
      return BAN_DAU;
  }
}

export function NapGiaVon({ open, onDong }: { open: boolean; onDong: () => void }) {
  const queryClient = useQueryClient();
  const [t, gui] = useReducer(rut, BAN_DAU);

  async function goi(file: File, cheDo: "kiem_tra" | "nap") {
    const form = new FormData();
    form.set("file", file);
    form.set("che_do", cheDo);

    try {
      const res = await fetch("/api/danh-muc/gia-von-dau-ky", { method: "POST", body: form });
      const j = (await res.json()) as {
        ketQua?: KetQuaGiaVon;
        tieuDe?: string;
        huongXuLy?: string;
      };

      if (!res.ok || !j.ketQua) {
        gui({
          kieu: "loi",
          tieuDe: j.tieuDe ?? "Không nạp được giá vốn",
          huongXuLy: j.huongXuLy ?? "Thử lại sau ít phút.",
        });
        return;
      }

      if (cheDo === "nap") {
        void queryClient.invalidateQueries({ queryKey: khoaSanPham.tatCa });
        gui({ kieu: "da_nap", ketQua: j.ketQua });
        return;
      }
      gui({ kieu: "xem_truoc", ketQua: j.ketQua });
    } catch {
      gui({
        kieu: "loi",
        tieuDe: "Không gửi được file",
        huongXuLy: "Kiểm tra kết nối mạng rồi thử lại.",
      });
    }
  }

  function chonFile(file: File): boolean {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      gui({ kieu: "loi", tieuDe: "File không phải .xlsx", huongXuLy: "Lưu lại thành .xlsx rồi chọn." });
      return false;
    }
    gui({ kieu: "chon_file", file });
    void goi(file, "kiem_tra");
    return false;
  }

  function dong() {
    if (t.dangGui) return;
    gui({ kieu: "lam_lai" });
    onDong();
  }

  const kq = t.ketQua;

  return (
    <Modal
      open={open}
      title="Nạp giá vốn đầu kỳ"
      width={880}
      closable={!t.dangGui}
      mask={{ closable: !t.dangGui }}
      onCancel={dong}
      footer={
        t.buoc === 1
          ? [
              <Button key="khac" disabled={t.dangGui} onClick={() => gui({ kieu: "lam_lai" })}>
                Chọn file khác
              </Button>,
              <Button
                key="nap"
                type="primary"
                loading={t.dangGui}
                disabled={(kq?.dat ?? 0) === 0}
                onClick={() => {
                  if (!t.file) return;
                  gui({ kieu: "dang_gui" });
                  void goi(t.file, "nap");
                }}
              >
                Đặt giá vốn cho {kq?.dat ?? 0} mã
              </Button>,
            ]
          : t.buoc === 2
            ? [
                <Button key="dong" type="primary" onClick={dong}>
                  Đóng
                </Button>,
              ]
            : null
      }
    >
      <Steps
        className="mb-4"
        size="small"
        current={t.buoc}
        items={[{ title: "Chọn file" }, { title: "Xem trước" }, { title: "Kết quả" }]}
      />

      <Alert
        className="mb-3"
        type="info"
        showIcon
        title="Chỉ đặt được cho mã đang có giá vốn 0. Sau khi mã đã có phiếu nhập thật, giá vốn do hệ thống tính và không nạp đè được nữa."
      />

      {t.loi ? (
        <Alert className="mb-3" type="error" showIcon title={t.loi.tieuDe} description={t.loi.huongXuLy} />
      ) : null}

      {t.buoc === 0 ? (
        <>
          <Upload.Dragger
            accept=".xlsx"
            maxCount={1}
            showUploadList={false}
            disabled={t.dangGui}
            beforeUpload={chonFile}
          >
            <p className="px-4 py-6">Kéo file vào đây — hai cột: Mã hàng và Giá vốn.</p>
          </Upload.Dragger>
          <Typography.Paragraph type="secondary" className="mt-3 mb-0">
            Tối đa {GIOI_HAN_FILE_MB}MB. <a href="/api/danh-muc/gia-von-dau-ky">Tải file mẫu</a>
          </Typography.Paragraph>
        </>
      ) : null}

      {t.buoc >= 1 && kq ? (
        <>
          <div className="mb-3 flex flex-wrap gap-8">
            <Statistic title="Sẽ đặt" value={kq.dat} valueStyle={{ color: "#389e0d" }} />
            <Statistic title="Bỏ qua (đã có giá vốn)" value={kq.bo_qua} />
            <Statistic
              title="Lỗi"
              value={kq.so_loi}
              valueStyle={kq.so_loi ? { color: "#cf1322" } : undefined}
            />
          </div>

          <div className="max-h-[50vh] overflow-auto">
            {kq.chi_tiet_bo_qua.length > 0 ? (
              <>
                <Typography.Text strong>Bỏ qua</Typography.Text>
                <Table
                  className="mb-3"
                  rowKey="ma_hang"
                  size="small"
                  pagination={false}
                  dataSource={kq.chi_tiet_bo_qua}
                  columns={[
                    { title: "Mã hàng", dataIndex: "ma_hang", width: 180 },
                    {
                      title: "Giá vốn hiện tại",
                      dataIndex: "gia_von_hien_tai",
                      width: 150,
                      align: "right",
                      render: (v: number) => Number(v).toLocaleString("vi-VN"),
                    },
                    { title: "Lý do", dataIndex: "ly_do" },
                  ]}
                />
              </>
            ) : null}

            {kq.loi.length > 0 ? (
              <>
                <Typography.Text strong>Lỗi</Typography.Text>
                <Table
                  rowKey={(r) => `${r.ma_hang}-${r.ly_do}`}
                  size="small"
                  pagination={false}
                  dataSource={kq.loi}
                  columns={[
                    { title: "Mã hàng", dataIndex: "ma_hang", width: 180 },
                    { title: "Lý do", dataIndex: "ly_do" },
                  ]}
                />
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {t.buoc === 2 && kq ? (
        <Alert
          className="mt-3"
          type="success"
          showIcon
          title={`Đã đặt giá vốn cho ${kq.dat} mã`}
          description={`${kq.bo_qua} mã bỏ qua vì đã có giá vốn.`}
        />
      ) : null}
    </Modal>
  );
}
