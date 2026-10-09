import { describe, expect, it } from "vitest";
import {
  toAddOrderLineResult,
  toOrderStatusCounts,
  toOrderDetail,
  toOrderLine,
  toOrderRow,
} from "@/features/sales-order/types";

describe("sales-order/types", () => {
  it("chi tiết đơn / dòng đơn map người nhận (Phase 12, DON-06)", () => {
    const internalOrderDetail = toOrderDetail({
      id: "dh-1",
      so_dh: "DH26-000001",
      ngay_dh: "2026-10-01",
      trang_thai: "TAM",
      ngay_giao_du_kien: null as unknown as string,
      doi_tac_id: null as unknown as string,
      ma_doi_tac: null as unknown as string,
      ten_doi_tac: null as unknown as string,
      nguoi_nhan_ids: ["nv-1", "nv-2"],
      ten_nguoi_nhan: ["An", "Bình"],
      ghi_chu: null as unknown as string,
      tong_so_luong_dat: 0,
      tong_so_luong_da_xuat: 0,
      ho_ten_nguoi_tao: "Văn phòng",
      created_at: "2026-10-01T00:00:00Z",
      hoa_don_id: null as unknown as string,
      so_hoa_don: null as unknown as string,
      ho_ten_nguoi_xac_nhan: null as unknown as string,
      ngay_xac_nhan: null as unknown as string,
    });
    // Phase 12 (DON-06): chi_tiet_don mang hóa đơn của đơn; chưa có thì null.
    expect(
      internalOrderDetail.invoice,
      "đơn chưa hoàn thành: không có hóa đơn",
    ).toBe(null);
    expect(
      toOrderDetail({
        id: "dh-2",
        so_dh: "DH26-000002",
        ngay_dh: "2026-10-01",
        trang_thai: "HOAN_THANH",
        ngay_giao_du_kien: null as unknown as string,
        doi_tac_id: "dt-1",
        ma_doi_tac: "KH01",
        ten_doi_tac: "Liên Hoa",
        nguoi_nhan_ids: [],
        ten_nguoi_nhan: [],
        ghi_chu: null as unknown as string,
        tong_so_luong_dat: 3,
        tong_so_luong_da_xuat: 3,
        ho_ten_nguoi_tao: "Văn phòng",
        created_at: "2026-10-01T00:00:00Z",
        hoa_don_id: "ct-9",
        so_hoa_don: "PX26-000009",
        ho_ten_nguoi_xac_nhan: "Quản lý",
        ngay_xac_nhan: "2026-10-03T08:00:00Z",
      }).invoice,
      "đơn hoàn thành: link sang hóa đơn",
    ).toStrictEqual({ id: "ct-9", number: "PX26-000009" });

    expect(
      internalOrderDetail.recipients,
      "chi_tiet_don của đơn nội bộ map ra danh sách nhân viên (RPC trả doi_tac_id null dù type khai string)",
    ).toStrictEqual({
      partner: null,
      staff: [
        { id: "nv-1", name: "An" },
        { id: "nv-2", name: "Bình" },
      ],
    });
    const partnerOrderRow = toOrderRow({
      id: "dh-2",
      so_dh: "DH26-000002",
      ngay_dh: "2026-10-01",
      trang_thai: "TAM",
      ngay_giao_du_kien: null as unknown as string,
      doi_tac_id: "dt-1",
      ma_doi_tac: "KH01",
      ten_doi_tac: "Liên Hoa",
      nguoi_nhan_ids: [],
      ten_nguoi_nhan: [],
      so_dong: 0,
      tong_so_luong_dat: 0,
      tong_so_luong_da_xuat: 0,
      ho_ten_nguoi_tao: "Văn phòng",
      ghi_chu: null as unknown as string,
      created_at: "2026-10-01T00:00:00Z",
      tong_so_dong: 1,
    });
    expect(
      partnerOrderRow.recipients,
      "danh_sach_don trả mã đối tác (0103) — cần để nhận ra đối tác nội bộ NB…",
    ).toStrictEqual({
      partner: { id: "dt-1", code: "KH01", name: "Liên Hoa" },
      staff: [],
    });

    expect(
      toOrderDetail({
        id: "dh-3",
        so_dh: "DH26-000003",
        ngay_dh: "2026-10-01",
        trang_thai: "TAM",
        ngay_giao_du_kien: null as unknown as string,
        doi_tac_id: "dt-1",
        ma_doi_tac: "KH01",
        ten_doi_tac: "Liên Hoa",
        nguoi_nhan_ids: [],
        ten_nguoi_nhan: [],
        ghi_chu: null as unknown as string,
        tong_so_luong_dat: 0,
        tong_so_luong_da_xuat: 0,
        ho_ten_nguoi_tao: "Văn phòng",
        created_at: "2026-10-01T00:00:00Z",
        hoa_don_id: null as unknown as string,
        so_hoa_don: null as unknown as string,
        ho_ten_nguoi_xac_nhan: null as unknown as string,
        ngay_xac_nhan: null as unknown as string,
      }).recipients.partner?.code,
    ).toBe("KH01");
    const orderLineRow = {
      id: "l1",
      san_pham_id: "p1",
      ma_hang: "A1",
      ten_hang: "Hàng",
      ten_dvt: null as unknown as string,
      so_luong_dat: 2,
      so_luong_da_xuat: 0,
      kho_mac_dinh_id: null as unknown as string,
      ten_kho_mac_dinh: null as unknown as string,
      created_at: "2026-10-01T00:00:00Z",
      ghi_chu: null as unknown as string,
      ten_nhom_hang: null as unknown as string,
    };
    {
      const assigned = toOrderLine({
        ...orderLineRow,
        nguoi_nhan_id: "nv-1",
        ten_nguoi_nhan: "An",
      });
      expect(assigned.recipientId).toBe("nv-1");
      expect(assigned.recipientName).toBe("An");
      const common = toOrderLine({
        ...orderLineRow,
        nguoi_nhan_id: null as unknown as string,
        ten_nguoi_nhan: null as unknown as string,
      });
      expect(common.recipientId).toBe(null);
      expect(common.recipientName).toBe(null);
    }
  });

  it("trạng thái đơn và kết quả thêm dòng (Phase 20, UI3B-05)", () => {
    expect(
      toOrderStatusCounts([
        { trang_thai: "TAM", so_don: 2 },
        { trang_thai: "HOAN_THANH", so_don: "5" },
      ] as unknown as Parameters<typeof toOrderStatusCounts>[0]),
    ).toStrictEqual({
      byStatus: { TAM: 2, DA_XAC_NHAN: 0, HOAN_THANH: 5, DA_HUY: 0 },
      total: 7,
    });
    expect(
      toAddOrderLineResult({
        dong_id: "l1",
        da_cong_don: true,
        so_luong_moi: "5",
      } as unknown as Parameters<typeof toAddOrderLineResult>[0]),
    ).toStrictEqual({ lineId: "l1", merged: true, quantity: 5 });
  });
});
