"use client";

import { Alert, Button, Modal, Result, Steps, Typography, Upload } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useReducer } from "react";

import { khoaSanPham } from "../api/san-pham.keys";
import { guiFileNhap, LoiNhapExcel, type PhanHoiNhap } from "../api/nhap-excel.api";
import { GIOI_HAN_FILE_MB } from "../lib/mau-excel";
import { XemTruocNhap } from "./xem-truoc-nhap";

type TrangThai = {
  buoc: 0 | 1 | 2;
  file: File | null;
  phanHoi: PhanHoiNhap | null;
  loi: { tieuDe: string; huongXuLy: string } | null;
  /** Server thấy lỗi mới lúc nạp → quay lại xem trước, chưa nạp gì. */
  doiDuLieu: boolean;
  dangGui: boolean;
};

type HanhDong =
  | { kieu: "chon_file"; file: File }
  | { kieu: "dang_gui" }
  | { kieu: "xem_truoc"; phanHoi: PhanHoiNhap }
  | { kieu: "da_nap"; phanHoi: PhanHoiNhap }
  | { kieu: "loi"; tieuDe: string; huongXuLy: string }
  | { kieu: "lam_lai" };

const BAN_DAU: TrangThai = {
  buoc: 0,
  file: null,
  phanHoi: null,
  loi: null,
  doiDuLieu: false,
  dangGui: false,
};

/** Nhiều trạng thái ràng buộc nhau (file / bước / lỗi / đang gửi) → useReducer. */
function rut(t: TrangThai, h: HanhDong): TrangThai {
  switch (h.kieu) {
    case "chon_file":
      return { ...BAN_DAU, file: h.file, dangGui: true };
    case "dang_gui":
      return { ...t, dangGui: true, loi: null };
    case "xem_truoc":
      return {
        ...t,
        buoc: 1,
        phanHoi: h.phanHoi,
        dangGui: false,
        loi: null,
        doiDuLieu: t.buoc === 1,
      };
    case "da_nap":
      return { ...t, buoc: 2, phanHoi: h.phanHoi, dangGui: false, loi: null, doiDuLieu: false };
    case "loi":
      return { ...t, dangGui: false, loi: { tieuDe: h.tieuDe, huongXuLy: h.huongXuLy } };
    case "lam_lai":
      return BAN_DAU;
  }
}

type Props = { open: boolean; onDong: () => void; onXemMoiSua: () => void };

export function NhapExcel({ open, onDong, onXemMoiSua }: Props) {
  const queryClient = useQueryClient();
  const [t, gui] = useReducer(rut, BAN_DAU);

  async function gomFile(file: File, cheDo: "kiem_tra" | "nap") {
    try {
      const phanHoi = await guiFileNhap(file, cheDo);

      if (cheDo === "nap" && phanHoi.ketQua.da_nap) {
        void queryClient.invalidateQueries({ queryKey: khoaSanPham.tatCa });
        void queryClient.invalidateQueries({ queryKey: ["lich-su-sua", "san_pham"] });
        gui({ kieu: "da_nap", phanHoi });
        return;
      }

      gui({ kieu: "xem_truoc", phanHoi });
    } catch (e) {
      if (e instanceof LoiNhapExcel) {
        gui({ kieu: "loi", tieuDe: e.tieuDe, huongXuLy: e.huongXuLy });
        return;
      }
      gui({
        kieu: "loi",
        tieuDe: "Không gửi được file",
        huongXuLy: "Kiểm tra kết nối mạng rồi bấm Kiểm tra lại.",
      });
    }
  }

  function chonFile(file: File): boolean {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      gui({
        kieu: "loi",
        tieuDe: "File không phải .xlsx",
        huongXuLy: "Mở bằng Excel rồi Lưu thành .xlsx, sau đó chọn lại.",
      });
      return false;
    }
    if (file.size > GIOI_HAN_FILE_MB * 1024 * 1024) {
      gui({
        kieu: "loi",
        tieuDe: `File lớn hơn ${GIOI_HAN_FILE_MB}MB`,
        huongXuLy: "Chia nhỏ file rồi nhập từng phần.",
      });
      return false;
    }

    gui({ kieu: "chon_file", file });
    void gomFile(file, "kiem_tra");
    return false; // antd không tự upload — ta tự gọi route handler.
  }

  function dong() {
    if (t.dangGui) return;
    gui({ kieu: "lam_lai" });
    onDong();
  }

  const kq = t.phanHoi?.ketQua;
  const soThayDoi = (kq?.them ?? 0) + (kq?.sua ?? 0);

  return (
    <Modal
      open={open}
      title="Nhập danh mục từ Excel"
      width={900}
      closable={!t.dangGui}
      maskClosable={!t.dangGui}
      onCancel={dong}
      footer={
        t.buoc === 1 ? (
          [
            <Button key="khac" disabled={t.dangGui} onClick={() => gui({ kieu: "lam_lai" })}>
              Chọn file khác
            </Button>,
            <Button
              key="nap"
              type="primary"
              loading={t.dangGui}
              disabled={(kq?.loi.length ?? 0) > 0 || soThayDoi === 0}
              onClick={() => {
                if (!t.file) return;
                gui({ kieu: "dang_gui" });
                void gomFile(t.file, "nap");
              }}
            >
              Nạp {soThayDoi} thay đổi
            </Button>,
          ]
        ) : t.buoc === 2 ? (
          [
            <Button key="xem" onClick={() => { gui({ kieu: "lam_lai" }); onXemMoiSua(); }}>
              Xem các mã vừa sửa
            </Button>,
            <Button key="dong" type="primary" onClick={dong}>
              Đóng
            </Button>,
          ]
        ) : null
      }
    >
      <Steps
        className="mb-4"
        size="small"
        current={t.buoc}
        items={[{ title: "Chọn file" }, { title: "Xem trước" }, { title: "Kết quả" }]}
      />

      {t.loi ? (
        <Alert
          className="mb-3"
          type="error"
          showIcon
          message={t.loi.tieuDe}
          description={t.loi.huongXuLy}
          action={
            t.file ? (
              <Button
                size="small"
                onClick={() => {
                  gui({ kieu: "dang_gui" });
                  void gomFile(t.file as File, "kiem_tra");
                }}
              >
                Kiểm tra lại
              </Button>
            ) : null
          }
        />
      ) : null}

      {t.doiDuLieu ? (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          message="Dữ liệu đã thay đổi từ lúc xem trước — kiểm tra lại các lỗi dưới đây. Chưa có gì được nạp."
        />
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
            <p className="px-4 py-6">
              Kéo file vào đây — nhận file mẫu hệ mới hoặc file DanhSachSanPham xuất từ
              KiotViet.
            </p>
          </Upload.Dragger>

          <Typography.Paragraph type="secondary" className="mt-3 mb-0">
            Ô để trống nghĩa là giữ nguyên giá trị đang có. Tối đa {GIOI_HAN_FILE_MB}MB.{" "}
            <a href="/api/danh-muc/mau-excel">Tải file mẫu trống</a>
          </Typography.Paragraph>
        </>
      ) : null}

      {t.buoc === 1 && t.phanHoi ? (
        <XemTruocNhap phanHoi={t.phanHoi} tenFile={t.file?.name ?? ""} />
      ) : null}

      {t.buoc === 2 && kq ? (
        <Result
          status="success"
          title={`Đã nạp: ${kq.them} mã mới, ${kq.sua} mã sửa`}
          subTitle={`${kq.khong_doi} mã trong file không có gì thay đổi.`}
        />
      ) : null}
    </Modal>
  );
}
