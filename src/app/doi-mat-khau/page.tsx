import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { TempPasswordNotice } from "@/features/auth/components/temp-password-notice";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default async function DoiMatKhauPage() {
  const nd = await getCurrentUser();

  if (!nd) redirect("/dang-nhap");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">Đặt mật khẩu mới</h1>
        <p className="mb-5 text-sm text-gray-500">
          {nd.fullName} · mật khẩu chỉ mình bạn biết
        </p>

        {nd.mustChangePassword ? <TempPasswordNotice /> : null}

        <ChangePasswordForm />

        {!nd.mustChangePassword ? (
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm">
              Quay lại
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
