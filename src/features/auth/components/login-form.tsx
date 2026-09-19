"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Form, Input } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/shared/lib/text";
import { explainError } from "@/shared/lib/errors";
import { safeRedirectPath } from "@/shared/lib/redirect-path";

import {
  loginSchema,
  type LoginInput,
} from "../schemas/login.schema";

/** Đăng nhập nội bộ dùng tên đăng nhập; Supabase Auth yêu cầu email — quy đổi ở text.ts (D-01). */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountDisabled = searchParams.get("loi") === "vo-hieu-hoa";

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (v: LoginInput) => {
    const { error } = await getSupabaseBrowserClient().auth.signInWithPassword(
      {
        email: usernameToEmail(v.username),
        password: v.password,
      },
    );

    if (error) {
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
      return;
    }

    router.replace(safeRedirectPath(searchParams.get("tiep_tuc")));
    router.refresh();
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {accountDisabled ? (
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
        validateStatus={errors.username ? "error" : ""}
        help={errors.username?.message}
      >
        <Controller
          name="username"
          control={control}
          render={({ field }) => (
            <Input {...field} autoComplete="username" autoFocus size="large" />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Mật khẩu"
        validateStatus={errors.password ? "error" : ""}
        help={errors.password?.message}
      >
        <Controller
          name="password"
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
