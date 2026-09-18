"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import {
  doiMatKhauSchema,
  type DoiMatKhauInput,
} from "@/features/cai-dat/schemas/nguoi-dung.schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { dienGiaiLoi } from "@/shared/lib/errors";

export function FormDoiMatKhau() {
  const router = useRouter();
  const { message } = App.useApp();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DoiMatKhauInput>({
    resolver: zodResolver(doiMatKhauSchema),
    defaultValues: { matKhauMoi: "", nhapLai: "" },
  });

  const onSubmit = async (v: DoiMatKhauInput) => {
    const sb = getSupabaseBrowserClient();

    const { error } = await sb.auth.updateUser({ password: v.matKhauMoi });
    if (error) {
      setError("matKhauMoi", { message: dienGiaiLoi(error).tieuDe });
      return;
    }

    // Gỡ cờ ở bảng: RLS không cho người dùng tự sửa hồ sơ nên phải qua RPC.
    const { error: loiCo } = await sb.rpc("da_doi_mat_khau");
    if (loiCo) {
      setError("root", { message: dienGiaiLoi(loiCo).huongXuLy });
      return;
    }

    message.success("Đã đổi mật khẩu");
    router.replace("/");
    router.refresh();
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Form.Item
        label="Mật khẩu mới"
        validateStatus={errors.matKhauMoi ? "error" : undefined}
        help={errors.matKhauMoi?.message}
      >
        <Controller
          name="matKhauMoi"
          control={control}
          render={({ field }) => (
            <Input.Password {...field} autoComplete="new-password" autoFocus size="large" />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Nhập lại mật khẩu mới"
        validateStatus={errors.nhapLai ? "error" : undefined}
        help={errors.nhapLai?.message}
      >
        <Controller
          name="nhapLai"
          control={control}
          render={({ field }) => (
            <Input.Password {...field} autoComplete="new-password" size="large" />
          )}
        />
      </Form.Item>

      {errors.root ? (
        <Form.Item>
          <span className="text-red-600">{errors.root.message}</span>
        </Form.Item>
      ) : null}

      <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
        Đặt mật khẩu mới
      </Button>
    </Form>
  );
}
