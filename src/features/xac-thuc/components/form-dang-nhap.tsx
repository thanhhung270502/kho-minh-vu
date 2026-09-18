"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Form, Input } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { tenDangNhapThanhEmail } from "@/shared/lib/chuan-hoa";
import { dienGiaiLoi } from "@/shared/lib/errors";
import { tiepTucAnToan } from "@/shared/lib/tiep-tuc";

import {
  dangNhapSchema,
  type DangNhapInput,
} from "../schemas/dang-nhap.schema";

/** Đăng nhập nội bộ dùng tên đăng nhập; Supabase Auth yêu cầu email — quy đổi ở chuan-hoa.ts (D-01). */
export function FormDangNhap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taiKhoanBiVoHieuHoa = searchParams.get("loi") === "vo-hieu-hoa";

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DangNhapInput>({
    resolver: zodResolver(dangNhapSchema),
    defaultValues: { tenDangNhap: "", matKhau: "" },
  });

  const onSubmit = async (v: DangNhapInput) => {
    const { error } = await getSupabaseBrowserClient().auth.signInWithPassword(
      {
        email: tenDangNhapThanhEmail(v.tenDangNhap),
        password: v.matKhau,
      },
    );

    if (error) {
      const loi = dienGiaiLoi(error);
      setError("root", { message: `${loi.tieuDe}. ${loi.huongXuLy}` });
      return;
    }

    router.replace(tiepTucAnToan(searchParams.get("tiep_tuc")));
    router.refresh();
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {taiKhoanBiVoHieuHoa ? (
        <Alert
          type="warning"
          showIcon
          title="Tài khoản đã bị vô hiệu hóa. Liên hệ quản lý để mở lại."
          className="mb-4"
        />
      ) : null}

      {errors.root ? (
        <Alert
          type="error"
          showIcon
          title={errors.root.message}
          className="mb-4"
        />
      ) : null}

      <Form.Item
        label="Tên đăng nhập"
        validateStatus={errors.tenDangNhap ? "error" : ""}
        help={errors.tenDangNhap?.message}
      >
        <Controller
          name="tenDangNhap"
          control={control}
          render={({ field }) => (
            <Input {...field} autoComplete="username" autoFocus size="large" />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Mật khẩu"
        validateStatus={errors.matKhau ? "error" : ""}
        help={errors.matKhau?.message}
      >
        <Controller
          name="matKhau"
          control={control}
          render={({ field }) => (
            <Input.Password
              {...field}
              autoComplete="current-password"
              size="large"
            />
          )}
        />
      </Form.Item>

      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={isSubmitting}
        >
          Đăng nhập
        </Button>
      </Form.Item>
    </Form>
  );
}
