import { describe, expect, it } from "vitest";
import { orderActionsFor } from "@/features/sales-order/lib/order-actions";
import { needsNegativeReason } from "@/features/sales-order/lib/complete-order";

describe("order-actions", () => {
  it("nút theo trạng thái × quyền và lỗi xuất âm thiếu lý do (Phase 12, DON-02/03/05)", () => {
    {
      const ql = {
        canEdit: true,
        canApprove: true,
        canComplete: true,
        canCancel: true,
      };
      const vp = {
        canEdit: true,
        canApprove: false,
        canComplete: true,
        canCancel: false,
      };
      const tk = {
        canEdit: false,
        canApprove: false,
        canComplete: false,
        canCancel: false,
      };
      expect(orderActionsFor("TAM", ql)).toStrictEqual(["approve", "cancel"]);
      expect(orderActionsFor("TAM", vp)).toStrictEqual([]);
      expect(orderActionsFor("DA_XAC_NHAN", ql)).toStrictEqual([
        "complete",
        "print",
        "unlock",
        "close-early",
        "cancel",
      ]);
      expect(orderActionsFor("DA_XAC_NHAN", vp)).toStrictEqual([
        "complete",
        "print",
      ]);
      expect(orderActionsFor("DA_XAC_NHAN", tk)).toStrictEqual(["print"]);
      expect(
        orderActionsFor("HOAN_THANH", ql),
        "đơn hoàn thành: hủy hóa đơn ở màn hóa đơn, không hủy đơn",
      ).toStrictEqual(["print"]);
      expect(orderActionsFor("DA_HUY", ql)).toStrictEqual([]);
      expect(
        !orderActionsFor("DA_XAC_NHAN", ql).includes("create-issue" as never),
        "không còn nút Tạo hóa đơn rời",
      ).toBeTruthy();
      // Phase 16: Xác nhận / Hoàn thành theo quyền chức vụ, Hủy đơn vẫn theo phạm vi quản trị.
      const nvXacNhan = { ...vp, canApprove: true };
      expect(
        orderActionsFor("TAM", nvXacNhan),
        "bật Xác nhận cho Nhân viên: không kèm Hủy đơn",
      ).toStrictEqual(["approve"]);
      expect(
        orderActionsFor("DA_XAC_NHAN", { ...ql, canComplete: false }),
        "tắt Hoàn thành: mất nút Hoàn thành dù vẫn sửa được đơn",
      ).toStrictEqual(["print", "unlock", "close-early", "cancel"]);

      // Lỗi xuất âm thiếu lý do của ghi_so_chung_tu (bẫy 8: object thường, không instanceof).
      expect(
        needsNegativeReason({
          code: "23514",
          message: "Phải chọn lý do xuất âm cho phiếu PX26-000010",
        }),
      ).toBe(true);
      expect(
        needsNegativeReason({
          code: "23514",
          message: "Đơn DH26-1 đang ở trạng thái TAM",
        }),
      ).toBe(false);
      expect(needsNegativeReason(new Error("mạng"))).toBe(false);
    }
  });
});
