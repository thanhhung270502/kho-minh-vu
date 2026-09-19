"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Checkbox, Form, Input, InputNumber, Select, Skeleton, Switch } from "antd";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { explainError, isPostgrestError } from "@/shared/lib/errors";

import { useChiTietSanPham, useDanhMucPhu, useLuuSanPham } from "../hooks/useSanPham";
import { sanPhamSchema, type SanPhamForm } from "../schemas/san-pham.schema";
import type { DanhMucPhu, SanPhamInput } from "../types";
import { soVn } from "./cot-san-pham";

type Props = {
  id: string | null;
  open: boolean;
  quyen: { suaGiaBan: boolean; xemGiaVon: boolean };
  onClose: () => void;
};

const MAC_DINH: SanPhamForm = {
  ma_hang: "",
  ten_hang: "",
  nhom_hang_id: null,
  dvt_id: "",
  cong_doan_id: "",
  quy_doi: 1,
  kho_mac_dinh_id: null,
  ton_toi_thieu: 0,
  ton_toi_da: null,
  gia_ban: 0,
  barcode: null,
  ghi_chu: null,
  dang_kinh_doanh: true,
};

/** Mã mới mặc định ĐVT "CAI" + công đoạn "MUA_NGOAI" — đúng đa số hàng thương mại. */
function macDinhTaoMoi(dm: DanhMucPhu | undefined): SanPhamForm {
  return {
    ...MAC_DINH,
    dvt_id: dm?.donViTinh.find((d) => d.ma === "CAI")?.id ?? "",
    cong_doan_id: dm?.congDoan.find((c) => c.ma === "MUA_NGOAI")?.id ?? "",
  };
}

export function NganKeoSanPham({ id, open, quyen, onClose }: Props) {
  const { message } = App.useApp();
  const danhMucPhu = useDanhMucPhu();
  const chiTiet = useChiTietSanPham(id ?? "");
  const luu = useLuuSanPham();
  const [taoTiep, setTaoTiep] = useState(false);

  const taoMoi = !id;
  const ct = id && chiTiet.data ? chiTiet.data : null;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    getValues,
    formState: { errors },
  } = useForm<SanPhamForm>({
    resolver: zodResolver(sanPhamSchema),
    defaultValues: MAC_DINH,
  });

  useEffect(() => {
    if (!open) return;

    if (!id) {
      reset(macDinhTaoMoi(danhMucPhu.data));
      return;
    }

    if (ct) {
      reset({
        ma_hang: ct.ma_hang,
        ten_hang: ct.ten_hang,
        nhom_hang_id: ct.nhom_hang_id ?? null,
        dvt_id: ct.dvt_id,
        cong_doan_id: ct.cong_doan_id,
        // numeric của Postgres về dạng chuỗi — ép số cho ô nhập.
        quy_doi: Number(ct.quy_doi),
        kho_mac_dinh_id: ct.kho_mac_dinh_id ?? null,
        ton_toi_thieu: Number(ct.ton_toi_thieu ?? 0),
        ton_toi_da: ct.ton_toi_da === null ? null : Number(ct.ton_toi_da),
        gia_ban: Number(ct.gia_ban ?? 0),
        barcode: ct.barcode ?? null,
        ghi_chu: ct.ghi_chu ?? null,
        dang_kinh_doanh: ct.dang_kinh_doanh,
      });
    }
  }, [open, id, ct, danhMucPhu.data, reset]);

  const onSave = handleSubmit(async (v) => {
    const giaTri: SanPhamInput = {
      ma_hang: v.ma_hang,
      ten_hang: v.ten_hang,
      nhom_hang_id: v.nhom_hang_id,
      dvt_id: v.dvt_id,
      cong_doan_id: v.cong_doan_id,
      quy_doi: Number(v.quy_doi),
      kho_mac_dinh_id: v.kho_mac_dinh_id,
      ton_toi_thieu: Number(v.ton_toi_thieu),
      ton_toi_da: v.ton_toi_da === null ? null : Number(v.ton_toi_da),
      gia_ban: Number(v.gia_ban),
      barcode: v.barcode,
      ghi_chu: v.ghi_chu,
      dang_kinh_doanh: v.dang_kinh_doanh,
    };

    try {
      await luu.mutateAsync({
        id: id ?? undefined,
        giaTri,
        guiGiaBan: quyen.suaGiaBan,
      });
      message.success(taoMoi ? `Đã tạo mã ${v.ma_hang}` : `Đã lưu mã ${v.ma_hang}`);

      if (taoMoi && taoTiep) {
        // Giữ nhóm / ĐVT / công đoạn / kho để nhập loạt mã cùng loại cho nhanh.
        const giu = getValues();
        reset({
          ...MAC_DINH,
          nhom_hang_id: giu.nhom_hang_id,
          dvt_id: giu.dvt_id,
          cong_doan_id: giu.cong_doan_id,
          kho_mac_dinh_id: giu.kho_mac_dinh_id,
        });
        setFocus("ma_hang");
        return;
      }
      onClose();
    } catch (e) {
      if (isPostgrestError(e)) {
        if (e.code === "23505") {
          setError("ma_hang", { message: "Mã hàng đã tồn tại. Dùng mã khác." });
          return;
        }
        if (e.code === "42501") {
          setError("root", {
            message:
              "Tài khoản không có quyền sửa danh mục hoặc giá bán. Nhờ quản lý thao tác giúp.",
          });
          return;
        }
        if (e.code === "23514") {
          setError("root", { message: e.message });
          return;
        }
      }
      const loi = explainError(e);
      setError("root", { message: `${loi.title}. ${loi.action}` });
    }
  });

  const dm = danhMucPhu.data;
  const canRa = Boolean(ct?.can_ra || ct?.can_ra_dvt);

  return (
    <FormDrawer
      open={open}
      title={taoMoi ? "Thêm mã hàng" : "Sửa mã hàng"}
      saving={luu.isPending}
      onClose={onClose}
      onSave={() => void onSave()}
      extra={
        taoMoi ? (
          <Checkbox checked={taoTiep} onChange={(e) => setTaoTiep(e.target.checked)}>
            Tạo tiếp mã khác
          </Checkbox>
        ) : null
      }
    >
      {id && chiTiet.isPending ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <Form layout="vertical" onFinish={() => void onSave()}>
          {errors.root ? (
            <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
          ) : null}

          {canRa ? (
            <Alert
              className="mb-4"
              type="warning"
              showIcon
              title="Mã này đang trong danh sách Cần rà"
              description="Kiểm tra lại đơn vị tính và công đoạn. Lưu ở đây KHÔNG tự gỡ cờ — gỡ bằng nút “Xác nhận đã rà” ngoài bảng."
            />
          ) : null}

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              label="Mã hàng"
              validateStatus={errors.ma_hang ? "error" : undefined}
              help={errors.ma_hang?.message}
            >
              <Controller
                name="ma_hang"
                control={control}
                render={({ field }) => <Input {...field} autoFocus={taoMoi} />}
              />
            </Form.Item>

            <Form.Item label="Nhóm hàng">
              <Controller
                name="nhom_hang_id"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chưa phân nhóm"
                    options={(dm?.nhomHang ?? []).map((n) => ({ value: n.id, label: n.ten }))}
                    onChange={(v) => field.onChange(v ?? null)}
                  />
                )}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Tên hàng"
            validateStatus={errors.ten_hang ? "error" : undefined}
            help={errors.ten_hang?.message}
          >
            <Controller
              name="ten_hang"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              label="Đơn vị tính"
              validateStatus={errors.dvt_id ? "error" : undefined}
              help={errors.dvt_id?.message ?? "Đếm hàng bằng gì: cái, cặp, bộ…"}
            >
              <Controller
                name="dvt_id"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    showSearch
                    optionFilterProp="label"
                    options={(dm?.donViTinh ?? []).map((d) => ({ value: d.id, label: d.ten }))}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Công đoạn"
              validateStatus={errors.cong_doan_id ? "error" : undefined}
              help={
                errors.cong_doan_id?.message ??
                "Hàng qua xử lý gì: sơn, carbon, xi mạ… hoặc mua ngoài"
              }
            >
              <Controller
                name="cong_doan_id"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    showSearch
                    optionFilterProp="label"
                    options={(dm?.congDoan ?? []).map((c) => ({ value: c.id, label: c.ten }))}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Quy đổi"
              validateStatus={errors.quy_doi ? "error" : undefined}
              help={errors.quy_doi?.message ?? "Số đơn vị cơ bản trong 1 ĐVT. Để 1 nếu không chắc"}
            >
              <Controller
                name="quy_doi"
                control={control}
                render={({ field }) => (
                  <InputNumber {...field} className="w-full" min={0} step={1} />
                )}
              />
            </Form.Item>

            <Form.Item label="Kho mặc định">
              <Controller
                name="kho_mac_dinh_id"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    placeholder="Không đặt"
                    options={(dm?.kho ?? []).map((k) => ({ value: k.id, label: k.ten }))}
                    onChange={(v) => field.onChange(v ?? null)}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Tồn tối thiểu"
              validateStatus={errors.ton_toi_thieu ? "error" : undefined}
              help={errors.ton_toi_thieu?.message}
            >
              <Controller
                name="ton_toi_thieu"
                control={control}
                render={({ field }) => <InputNumber {...field} className="w-full" min={0} />}
              />
            </Form.Item>

            <Form.Item
              label="Tồn tối đa"
              validateStatus={errors.ton_toi_da ? "error" : undefined}
              help={errors.ton_toi_da?.message}
            >
              <Controller
                name="ton_toi_da"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    className="w-full"
                    min={0}
                    placeholder="Không giới hạn"
                    onChange={(v) => field.onChange(v ?? null)}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Giá bán"
              validateStatus={errors.gia_ban ? "error" : undefined}
              help={
                errors.gia_ban?.message ??
                (quyen.suaGiaBan ? undefined : "Chỉ quản lý đặt giá bán")
              }
            >
              <Controller
                name="gia_ban"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    className="w-full"
                    min={0}
                    disabled={!quyen.suaGiaBan}
                    formatter={(v) => (v === undefined ? "" : soVn(v))}
                    parser={(v) => Number((v ?? "").replace(/\D/g, ""))}
                  />
                )}
              />
            </Form.Item>

            {quyen.xemGiaVon && ct ? (
              <Form.Item label="Giá vốn" help="Tính tự động từ phiếu nhập, không sửa tay">
                <Input readOnly value={soVn(ct.gia_von)} />
              </Form.Item>
            ) : null}
          </div>

          <Form.Item label="Barcode">
            <Controller
              name="barcode"
              control={control}
              render={({ field }) => <Input {...field} value={field.value ?? ""} />}
            />
          </Form.Item>

          <Form.Item label="Ghi chú">
            <Controller
              name="ghi_chu"
              control={control}
              render={({ field }) => (
                <Input.TextArea {...field} value={field.value ?? ""} rows={2} />
              )}
            />
          </Form.Item>

          {!taoMoi ? (
            <Form.Item
              label="Đang kinh doanh"
              help="Tắt để ẩn mã khỏi danh sách mặc định. Tồn và lịch sử vẫn giữ nguyên."
            >
              <Controller
                name="dang_kinh_doanh"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onChange={field.onChange} />
                )}
              />
            </Form.Item>
          ) : null}
        </Form>
      )}
    </FormDrawer>
  );
}
