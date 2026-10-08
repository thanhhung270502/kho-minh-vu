import { describe, expect, it } from "vitest";
import {
  groupDocuments,
  mapHeaders,
  parseDateCell,
  parseNegativeReason,
  parseQuantityCell,
  parseRecipientKind,
  splitStaffNames,
  type DocumentFileRow,
} from "@/features/document-excel/lib/document-excel";

describe("document-excel", () => {
  it("nhập chứng từ từ Excel (0104, 0122)", () => {
    expect(parseDateCell("03/10/2026")).toBe("2026-10-03");
    expect(parseDateCell("2026-10-03")).toBe("2026-10-03");
    expect(parseDateCell(new Date(Date.UTC(2026, 9, 3)))).toBe("2026-10-03");
    expect(parseDateCell(46298), "số serial Excel").toBe("2026-10-03");
    expect(parseDateCell("31/02/2026"), "ngày không có thật").toBe(null);
    expect(parseQuantityCell("1.200"), "dấu chấm phân nghìn").toBe(1200);
    expect(parseQuantityCell("1,5")).toBe(1.5);
    expect(parseQuantityCell("abc")).toBe(null);
    expect(parseRecipientKind("Nội bộ")).toBe("NOI_BO");
    expect(parseRecipientKind("Đối tác")).toBe("DOI_TAC");
    expect(splitStaffNames("NGỌC - QUỲNH")).toStrictEqual(["NGỌC", "QUỲNH"]);
    expect(
      parseNegativeReason("Lệch tồn, chờ kiểm kê", {
        LECH_TON_CHO_KIEM_KE: "Lệch tồn, chờ kiểm kê",
      }),
    ).toStrictEqual({ code: "LECH_TON_CHO_KIEM_KE", note: null });
    expect(parseNegativeReason("hàng gửi trước", {})).toStrictEqual({
      code: "KHAC",
      note: "hàng gửi trước",
    });

    const h = mapHeaders("hoa-don", [
      "ma_dat_hang",
      "ma_hoa_don",
      "ngay",
      "kho_khong_can_de_kho_nao",
      "ma_hang",
      "tong_so_luong",
      "so_luong",
    ]);
    expect(h.warehouse, "tiền tố").toBe("kho_khong_can_de_kho_nao");
    expect(h.quantity, "không ăn nhầm tong_so_luong").toBe("so_luong");
    expect(h.orderNo).toBe("ma_dat_hang");
    const p = mapHeaders("phieu-nhap", [
      "ma_nhap_hang",
      "ngay_nhap",
      "ma_ncc",
      "ghi_chu_phieu",
      "ma_hang",
      "so_luong",
      "ghi_chu_dong",
    ]);
    expect(p.note).toBe("ghi_chu_phieu");
    expect(p.lineNote).toBe("ghi_chu_dong");
    expect(mapHeaders("phieu-nhap", ["nguoi_nhap", "nguoi_tao"]).receiver).toBe(
      "nguoi_nhap",
    );
    // Mẫu Nhập kho 08/10/2026: "Tổng số lượng" không ăn nhầm cột Số lượng; Ghi chú = ghi chú phiếu.
    {
      const pn = mapHeaders("phieu-nhap", [
        "ma_nhap_hang",
        "ngay_nhap",
        "ma_nha_cung_cap",
        "nguoi_nhap",
        "nguoi_tao",
        "ghi_chu",
        "tong_so_luong",
        "tong_so_mat_hang",
        "trang_thai",
        "ma_hang",
        "so_luong",
      ]);
      expect(pn.quantity).toBe("so_luong");
      expect(pn.totalQuantity).toBe("tong_so_luong");
      expect(pn.note).toBe("ghi_chu");
      expect(pn.partnerCode).toBe("ma_nha_cung_cap");
      expect(pn.lineNote).toBe(undefined);
    }
    // 0122: mẫu Duyệt đơn — "Người duyệt đơn" là trường riêng, "Ghi chú dòng" không bị cột Ghi chú ăn mất.
    {
      const hd = mapHeaders("hoa-don", [
        "ma_dat_hang",
        "ma_hoa_don",
        "ngay",
        "ma_khach_hang",
        "nguoi_duyet_don",
        "nguoi_tao",
        "ghi_chu",
        "trang_thai",
        "ma_hang",
        "ghi_chu_dong",
        "so_luong",
      ]);
      expect(hd.approver).toBe("nguoi_duyet_don");
      expect(hd.note).toBe("ghi_chu");
      expect(hd.lineNote).toBe("ghi_chu_dong");
      expect(hd.createdBy).toBe("nguoi_tao");
    }

    const row = (o: Partial<DocumentFileRow>): DocumentFileRow => ({
      row: 2,
      docNo: "HD1",
      orderNo: "",
      date: "2026-10-03",
      dateRaw: "03/10/2026",
      dueDate: null,
      recipientKind: "",
      partnerCode: "NB001",
      staff: "",
      source: "",
      warehouse: "",
      note: "",
      productCode: "A",
      quantity: 1,
      quantityRaw: "1",
      lineNote: "",
      negativeReason: "",
      receiver: "",
      approver: "",
      ...o,
    });
    const g = groupDocuments(
      [
        row({ row: 2, staff: "NGỌC" }),
        row({
          row: 3,
          productCode: "B",
          quantity: 2,
          quantityRaw: "2",
          staff: "QUỲNH - NGỌC",
        }),
        row({ row: 4, docNo: "HD2", quantity: null, quantityRaw: "x" }),
        row({ row: 5, docNo: "" }),
      ],
      {},
    );
    expect(g.documents.length).toBe(2);
    expect(
      g.documents[0]?.nhan_vien,
      "gộp nhân viên, không trùng",
    ).toStrictEqual(["NGỌC", "QUỲNH"]);
    expect(g.documents[0]?.dong.length).toBe(2);
    expect(g.documents[0]?.dong_dau).toBe(2);
    expect(g.issues.map((i) => i.row)).toStrictEqual([4, 5]);
    const headerOnly = groupDocuments(
      [row({ productCode: "", quantity: null, quantityRaw: "" })],
      {},
    );
    expect(
      headerOnly.documents[0]?.dong.length,
      "dòng trống mã + số lượng = chỉ sửa đầu phiếu",
    ).toBe(0);
  });
});
