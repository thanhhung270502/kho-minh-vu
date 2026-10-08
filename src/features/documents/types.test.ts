import { describe, expect, it } from "vitest";
import {
  toDocumentDetail,
  toDocumentLineRecipient,
  withLineRecipients,
} from "@/features/documents/types";

describe("documents/types", () => {
  it("phiếu xuất từ đơn nội bộ: người nhận theo dòng (0076)", () => {
    const internalIssue = toDocumentDetail({
      id: "ct-1",
      so_ct: "PX26-000001",
      ngay_ct: "2026-10-01",
      loai_ct: "XUAT",
      nguon_nhap: null as unknown as "NCC",
      trang_thai: "NHAP_LIEU",
      kho_id: "k1",
      ten_kho: "Kho 1",
      doi_tac_id: null as unknown as string,
      ma_doi_tac: null as unknown as string,
      ten_doi_tac: null as unknown as string,
      ghi_chu: null as unknown as string,
      tong_so_luong: 3,
      tong_tien: 0,
      ho_ten_nguoi_tao: "Văn phòng",
      ngay_ghi_so: null as unknown as string,
      created_at: "2026-10-01T00:00:00Z",
      don_dat_hang_id: "dh-1",
      so_dh: "DH26-000002",
      chung_tu_goc_id: null as unknown as string,
      so_ct_goc: null as unknown as string,
      ly_do_xuat_am: null as unknown as string,
      ghi_chu_ly_do: null as unknown as string,
      nguoi_duyet_id: null as unknown as string,
      nguoi_nhan_ids: ["nd-1"],
      ten_nguoi_nhan: ["Thủ kho K1"],
      ho_ten_nguoi_duyet: "Quản lý",
      ho_ten_nguoi_xac_nhan_don: "Quản lý",
    });
    expect(internalIssue.staffRecipients).toStrictEqual([
      { id: "nd-1", name: "Thủ kho K1" },
    ]);

    expect(
      toDocumentLineRecipient({
        chung_tu_dong_id: "l1",
        nguoi_nhan_id: "nv-1",
        ten_nguoi_nhan: "An",
      }),
    ).toStrictEqual({ lineId: "l1", recipientId: "nv-1", recipientName: "An" });
    expect(
      withLineRecipients(
        [
          { id: "l1", x: 1 },
          { id: "l2", x: 2 },
        ],
        [{ lineId: "l1", recipientId: "nv-1", recipientName: "An" }],
      ),
    ).toStrictEqual([
      { id: "l1", x: 1, recipientId: "nv-1", recipientName: "An" },
      { id: "l2", x: 2, recipientId: null, recipientName: null },
    ]);
  });
});
