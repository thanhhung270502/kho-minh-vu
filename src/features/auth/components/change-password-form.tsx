"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/features/cai-dat/schemas/nguoi-dung.schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { explainError } from "@/shared/lib/errors";

export function ChangePasswordForm() {
  const router = useRouter();
  const { message } = App.useApp();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (v: ChangePasswordInput) => {
    const sb = getSupabaseBrowserClient();

    const { error } = await sb.auth.updateUser({ password: v.newPassword });
    if (error) {
      setError("newPassword", { message: explainError(error).title });
      return;
    }

    // Gỡ cờ ở bảng: RLS không cho người dùng tự sửa hồ sơ nên phải qua RPC.
    const { error: flagError } = await sb.rpc("da_doi_mat_khau");
    if (flagError) {
      setError("root", { message: explainError(flagError).action });
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
        validateStatus={errors.newPassword ? "error" : undefined}
        help={errors.newPassword?.message}
      >
        <Controller
          name="newPassword"
          control={control}
          render={({ field }) => (
            <Input.Password {...field} autoComplete="new-password" autoFocus size="large" />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Nhập lại mật khẩu mới"
        validateStatus={errors.confirmPassword ? "error" : undefined}
        help={errors.confirmPassword?.message}
      >
        <Controller
          name="confirmPassword"
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
