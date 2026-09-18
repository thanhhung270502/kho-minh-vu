import { z } from "zod";

const loiSchema = z.object({
  dong: z.number(),
  cot: z.string(),
  thong_bao: z.string(),
});

const thayDoiSchema = z.object({
  dong: z.number(),
  ma_hang: z.string(),
  loai: z.enum(["THEM", "SUA"]),
  /** `{ ten_hang: [cũ, mới] }` — RPC trả mảng 2 phần tử cho mỗi trường đổi. */
  truong: z.record(z.string(), z.array(z.unknown())).nullable().optional(),
});

const ketQuaSchema = z.object({
  tong: z.number(),
  them: z.number(),
  sua: z.number(),
  khong_doi: z.number(),
  da_nap: z.boolean(),
  loi: z.array(loiSchema),
  thay_doi: z.array(thayDoiSchema),
  thay_doi_bi_cat: z.boolean().optional(),
});

const phanHoiSchema = z.object({
  dinhDang: z.enum(["mau_moi", "kiotviet"]),
  ketQua: ketQuaSchema,
});

export type LoiDong = z.infer<typeof loiSchema>;
export type ThayDoiDong = z.infer<typeof thayDoiSchema>;
export type KetQuaNhap = z.infer<typeof ketQuaSchema>;
export type PhanHoiNhap = z.infer<typeof phanHoiSchema>;

/** Lỗi có sẵn câu tiếng Việt do route handler soạn — không cần dịch lại. */
export class LoiNhapExcel extends Error {
  constructor(
    readonly tieuDe: string,
    readonly huongXuLy: string,
    readonly status: number,
  ) {
    super(`${tieuDe}. ${huongXuLy}`);
    this.name = "LoiNhapExcel";
  }
}

export async function guiFileNhap(
  file: File,
  cheDo: "kiem_tra" | "nap",
): Promise<PhanHoiNhap> {
  const form = new FormData();
  form.set("file", file);
  form.set("che_do", cheDo);

  const res = await fetch("/api/danh-muc/nhap-excel", { method: "POST", body: form });

  if (!res.ok) {
    if (res.status === 401) {
      // Tải lại hẳn trang đăng nhập: phiên hỏng thì cache TanStack Query cũng
      // không còn dùng được.
      // Cần tải lại hẳn trang, không dùng router.push: cache TanStack Query của
      // phiên cũ phải bị bỏ đi cùng.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/dang-nhap?tiep_tuc=/danh-muc");
    }

    let tieuDe = "Không nhập được file";
    let huongXuLy = "Thử lại sau ít phút. Nếu vẫn lỗi, báo quản trị.";
    try {
      const j = (await res.json()) as { tieuDe?: string; huongXuLy?: string };
      tieuDe = j.tieuDe ?? tieuDe;
      huongXuLy = j.huongXuLy ?? huongXuLy;
    } catch {
      /* server trả không phải JSON — giữ câu mặc định */
    }

    throw new LoiNhapExcel(tieuDe, huongXuLy, res.status);
  }

  // Dữ liệu từ mạng là `unknown` cho tới khi parse.
  return phanHoiSchema.parse(await res.json());
}
