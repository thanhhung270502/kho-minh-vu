import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { layNguoiDungHienTai } from "@/features/xac-thuc/api/nguoi-dung-hien-tai.server";
import { FormDoiMatKhau } from "@/features/xac-thuc/components/form-doi-mat-khau";
import { ThongBaoMatKhauTam } from "@/features/xac-thuc/components/thong-bao-mat-khau-tam";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default async function DoiMatKhauPage() {
  const nd = await layNguoiDungHienTai();

  if (!nd) redirect("/dang-nhap");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">Đặt mật khẩu mới</h1>
        <p className="mb-5 text-sm text-gray-500">
          {nd.hoTen} · mật khẩu chỉ mình bạn biết
        </p>

        {nd.phaiDoiMatKhau ? <ThongBaoMatKhauTam /> : null}

        <FormDoiMatKhau />

        {!nd.phaiDoiMatKhau ? (
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
