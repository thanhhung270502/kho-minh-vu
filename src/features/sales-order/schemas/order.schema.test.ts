import { describe, expect, it } from "vitest";
import {
  statusCountKeyOf,
  toAddOrderLineRpcArgs,
  toOrderStatusCountRpcArgs,
  DEFAULT_ORDER_FILTER,
  countActiveOrderFilters,
  orderRecipientsSchema,
  readOrderFilterFromUrl,
  toCreateOrderRpcArgs,
  toOrderLineInsert,
  toOrderLineUpdate,
  toOrderListRpcArgs,
  toOrderUpdate,
  toSetOrderRecipientsRpcArgs,
  writeOrderFilterToUrl,
} from "@/features/sales-order/schemas/order.schema";

describe("order.schema", () => {
  it("người nhận, dòng đơn, bộ lọc chế độ người nhận (0097, 0076)", () => {
    {
      const uuid1 = "11111111-1111-4111-8111-111111111111";
      const uuid2 = "22222222-2222-4222-8222-222222222222";
      // 0097: đơn tạm được trống người nhận — database đòi người nhận lúc xác nhận.
      expect(
        orderRecipientsSchema.safeParse({ partnerId: null, staffIds: [] })
          .success,
      ).toBe(true);
      expect(
        orderRecipientsSchema.safeParse({ partnerId: uuid1, staffIds: [] })
          .success,
      ).toBe(true);
      expect(
        orderRecipientsSchema.safeParse({ partnerId: null, staffIds: [uuid2] })
          .success,
      ).toBe(true);
      expect(
        toCreateOrderRpcArgs({ partnerId: null, staffIds: ["u1"] }),
      ).toStrictEqual({
        p_doi_tac_id: undefined,
        p_nguoi_nhan_ids: ["u1"],
      });
      expect(
        toSetOrderRecipientsRpcArgs("o1", { partnerId: "d1", staffIds: [] }),
      ).toStrictEqual({
        p_don_id: "o1",
        p_doi_tac_id: "d1",
        p_nguoi_nhan_ids: [],
      });
      expect(toOrderLineUpdate({ recipientId: null })).toStrictEqual({
        nguoi_nhan_id: null,
      });
      expect(toOrderLineUpdate({ recipientId: "nv-1" })).toStrictEqual({
        nguoi_nhan_id: "nv-1",
      });
      expect(
        toOrderLineUpdate({ quantity: 3 }),
        "không đụng người nhận",
      ).toStrictEqual({ so_luong_dat: 3 });
      expect(
        toOrderLineInsert("o1", {
          productId: "p1",
          quantity: 2,
          recipientId: "nv-1",
        }),
      ).toStrictEqual({
        don_dat_hang_id: "o1",
        san_pham_id: "p1",
        so_luong_dat: 2,
        nguoi_nhan_id: "nv-1",
      });
      expect(
        "nguoi_nhan_id" in
          toOrderLineInsert("o1", { productId: "p1", quantity: 2 }),
      ).toBe(false);
      const staffFilter = readOrderFilterFromUrl(
        new URLSearchParams(`nhan_vien=${uuid1}`),
      );
      expect(staffFilter.staffId).toBe(uuid1);
      expect(
        readOrderFilterFromUrl(new URLSearchParams("nhan_vien=abc")).staffId,
      ).toBe(null);
      expect(writeOrderFilterToUrl(staffFilter).get("nhan_vien")).toBe(uuid1);
      expect(toOrderListRpcArgs(staffFilter).p_nguoi_nhan_id).toBe(uuid1);
      expect(toOrderListRpcArgs(DEFAULT_ORDER_FILTER).p_nguoi_nhan_id).toBe(
        undefined,
      );
      expect(
        countActiveOrderFilters({ ...DEFAULT_ORDER_FILTER, staffId: uuid1 }),
      ).toBe(1);
    }
    expect(
      toOrderUpdate({ note: "x" }),
      "không đụng người nhận khi không đổi",
    ).toStrictEqual({ ghi_chu: "x" });

    // Bộ lọc chế độ người nhận trên URL — giá trị URL tiếng Việt không dấu, giá trị
    // RPC là hợp đồng với database (p_loai_nhan: DOI_TAC | NOI_BO).
    const internalFilter = readOrderFilterFromUrl(
      new URLSearchParams("nguoi_nhan=noi_bo"),
    );
    expect(internalFilter.recipientKind, "?nguoi_nhan=noi_bo → internal").toBe(
      "internal",
    );
    expect(
      readOrderFilterFromUrl(new URLSearchParams("nguoi_nhan=doi_tac"))
        .recipientKind,
    ).toBe("partner");
    expect(
      readOrderFilterFromUrl(new URLSearchParams("nguoi_nhan=bay"))
        .recipientKind,
      "giá trị lạ → bỏ qua",
    ).toBe(null);
    expect(
      readOrderFilterFromUrl(new URLSearchParams("nguoi_nhan=toString"))
        .recipientKind,
      "khóa prototype không lọt qua",
    ).toBe(null);
    expect(
      writeOrderFilterToUrl(internalFilter).get("nguoi_nhan"),
      "ghi ngược ra URL",
    ).toBe("noi_bo");
    expect(
      writeOrderFilterToUrl(DEFAULT_ORDER_FILTER).has("nguoi_nhan"),
      "mặc định không ghi tham số",
    ).toBe(false);
    expect(toOrderListRpcArgs(internalFilter).p_loai_nhan).toBe("NOI_BO");
    expect(
      toOrderListRpcArgs(DEFAULT_ORDER_FILTER).p_loai_nhan,
      "tất cả → không gửi p_loai_nhan",
    ).toBe(undefined);
    expect(
      countActiveOrderFilters(internalFilter),
      "lọc chế độ tính là một điều kiện đang bật",
    ).toBe(1);
  });

  it("khóa đếm trạng thái và trạng thái nhiều lựa chọn (Phase 20, UI3B-05/06)", () => {
    const staff = "11111111-1111-4111-8111-111111111111";
    const countArgs = toOrderStatusCountRpcArgs({
      ...DEFAULT_ORDER_FILTER,
      statuses: ["TAM"],
      page: 3,
      recipientKind: "internal",
      staffId: staff,
    });
    expect(countArgs).toStrictEqual({
      p_doi_tac_id: undefined,
      p_tu_ngay: undefined,
      p_den_ngay: undefined,
      p_tu_khoa: undefined,
      p_loai_nhan: "NOI_BO",
      p_nguoi_nhan_id: staff,
    });
    expect(
      !("p_trang_thai" in countArgs) &&
        !("p_trang" in countArgs) &&
        !("p_kich_thuoc" in countArgs),
    ).toBeTruthy();
    expect(
      statusCountKeyOf({ ...DEFAULT_ORDER_FILTER, statuses: ["TAM"], page: 3 }),
      "đổi trạng thái/trang không đổi khóa đếm",
    ).toStrictEqual(
      statusCountKeyOf({
        ...DEFAULT_ORDER_FILTER,
        statuses: ["TAM", "HOAN_THANH"],
        page: 1,
      }),
    );

    // Trạng thái nhiều lựa chọn: mặc định ẩn Đã hủy, không ghi lên URL; tích đủ = không lọc.
    {
      const def = readOrderFilterFromUrl(new URLSearchParams(""));
      expect(def.statuses).toStrictEqual(["TAM", "DA_XAC_NHAN", "HOAN_THANH"]);
      expect(writeOrderFilterToUrl(def).get("trang_thai")).toBe(null);
      expect(toOrderListRpcArgs(def).p_trang_thai).toStrictEqual([
        "TAM",
        "DA_XAC_NHAN",
        "HOAN_THANH",
      ]);
      const all = readOrderFilterFromUrl(
        new URLSearchParams("trang_thai=DA_HUY,TAM,HOAN_THANH,DA_XAC_NHAN"),
      );
      expect(all.statuses, "giữ thứ tự chuẩn").toStrictEqual([
        "TAM",
        "DA_XAC_NHAN",
        "HOAN_THANH",
        "DA_HUY",
      ]);
      expect(toOrderListRpcArgs(all).p_trang_thai).toBe(undefined);
      expect(
        readOrderFilterFromUrl(new URLSearchParams("trang_thai=xyz")).statuses,
      ).toStrictEqual(def.statuses);
    }
    expect(
      toAddOrderLineRpcArgs("o1", {
        productId: "p1",
        quantity: 2,
        recipientId: null,
      }),
    ).toStrictEqual({
      p_don_id: "o1",
      p_san_pham_id: "p1",
      p_so_luong: 2,
      p_nguoi_nhan_id: undefined,
    });
    expect(
      toAddOrderLineRpcArgs("o1", {
        productId: "p1",
        quantity: 2,
        recipientId: "nv",
      }).p_nguoi_nhan_id,
    ).toBe("nv");
  });
});
