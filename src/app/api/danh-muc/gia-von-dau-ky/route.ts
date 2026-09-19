import ExcelJS from "exceljs";

import { COT_GIA_VON, type DongGiaVon } from "@/features/danh-muc/lib/mau-gia-von";
import { GIOI_HAN_FILE_MB } from "@/features/danh-muc/lib/mau-excel";
import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readString, readFirstSheet, readNumber } from "@/shared/lib/excel-cell";
import { explainError } from "@/shared/lib/errors";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";

function loi(title: string, action: string, status: number) {
  return Response.json({ title, action }, { status });
}

/** Giá vốn đầu kỳ là việc một lần của quản lý, không phải việc hằng ngày. */
async function gacQuanLy() {
  const nd = await getCurrentUser();
  if (!nd) {
    return loi("Phiên đăng nhập đã hết hạn", "Đăng nhập lại rồi thử lần nữa.", 401);
  }
  if (nd.role !== "quan_ly") {
    return loi(
      "Chỉ quản lý đặt được giá vốn đầu kỳ",
      "Giá vốn ảnh hưởng mọi báo cáo lãi lỗ. Nhờ quản lý thao tác giúp.",
      403,
    );
  }
  return null;
}

export async function GET() {
  const chan = await gacQuanLy();
  if (chan) return chan;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kho Minh Vũ";
  const ws = wb.addWorksheet("Giá vốn đầu kỳ");
  ws.columns = COT_GIA_VON.map((c) => ({ header: c.title, key: c.khoa, width: c.rong }));
  ws.getRow(1).font = { bold: true };

  const hd = wb.addWorksheet("Hướng dẫn");
  hd.columns = [
    { header: "Điều cần biết", key: "x", width: 92 },
  ];
  hd.getRow(1).font = { bold: true };
  for (const dong of [
    "Chỉ đặt được cho mã đang có giá vốn 0.",
    "Mã đã có giá vốn (do phiếu nhập thật) sẽ bị bỏ qua — hệ thống tự tính, không nạp đè.",
    "Giá vốn phải là số lớn hơn 0. Dòng sai sẽ được liệt kê, cả file vẫn nạp được phần đúng.",
    "Mỗi lần đặt đều ghi vào nhật ký sửa của mã hàng.",
  ]) {
    hd.addRow({ x: dong });
  }

  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-gia-von-dau-ky.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const chan = await gacQuanLy();
  if (chan) return chan;

  const form = await request.formData();
  const file = form.get("file");
  const cheDo = form.get("che_do") === "nap" ? "nap" : "kiem_tra";

  if (!(file instanceof File)) {
    return loi("Chưa chọn file", "Chọn một file Excel (.xlsx) rồi thử lại.", 400);
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return loi("File không phải .xlsx", "Lưu lại thành .xlsx rồi tải lên.", 400);
  }
  if (file.size > GIOI_HAN_FILE_MB * 1024 * 1024) {
    return loi(`File lớn hơn ${GIOI_HAN_FILE_MB}MB`, "Chia nhỏ file rồi nạp từng phần.", 413);
  }

  let dong: DongGiaVon[];
  try {
    const doc = await readFirstSheet(Buffer.from(await file.arrayBuffer()));
    if (!doc.headers.includes("ma_hang") || !doc.headers.includes("gia_von")) {
      return loi(
        "Không thấy hai cột bắt buộc",
        "File cần đúng hai cột: Mã hàng và Giá vốn. Tải file mẫu để đối chiếu.",
        422,
      );
    }
    dong = doc.rows.map((d) => ({
      ma_hang: readString(d.cells["ma_hang"]),
      gia_von: readNumber(d.cells["gia_von"]),
    }));
  } catch (e) {
    return loi(
      "Không đọc được file",
      e instanceof Error ? e.message : "Kiểm tra lại file rồi thử lần nữa.",
      422,
    );
  }

  // Gọi bằng phiên của chính người dùng: RPC tự kiểm vai trò lần nữa.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("dat_gia_von_dau_ky", {
    p_du_lieu: dong as unknown as Json,
    p_chi_kiem_tra: cheDo !== "nap",
  });

  if (error) {
    const dien = explainError(error);
    return loi(dien.title, dien.action, dien.kind === "forbidden" ? 403 : 500);
  }

  return Response.json({ ketQua: data });
}
