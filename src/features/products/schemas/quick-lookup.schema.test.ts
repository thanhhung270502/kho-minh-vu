import { describe, expect, it } from "vitest";
import {
  quickLookupSchema,
  suggestLookupCode,
  toQuickLookupInsert,
} from "@/features/products/schemas/quick-lookup.schema";

describe("quick-lookup.schema", () => {
  it("mã gợi ý từ tên và schema thêm nhanh (Phase 11, NVPT-04)", () => {
    {
      expect(suggestLookupCode("Xi mạ bóng")).toBe("XI_MA_BONG");
      expect(suggestLookupCode("  Đèn / pha (LED) ")).toBe("DEN_PHA_LED");
      expect(
        suggestLookupCode("Phụ tùng thay thế chính hãng Honda"),
        "cắt còn 20 ký tự",
      ).toBe("PHU_TUNG_THAY_THE_CH");
      expect(suggestLookupCode("!!!")).toBe("");

      const ok = quickLookupSchema.safeParse({
        code: " ab-1 ",
        name: "  Cặp ",
      });
      expect(ok.success).toBeTruthy();
      expect(ok.success ? toQuickLookupInsert(ok.data) : null).toStrictEqual({
        ma: "AB-1",
        ten: "Cặp",
      });
      const bad = quickLookupSchema.safeParse({ code: "có dấu", name: "" });
      expect(
        bad.success ? [] : bad.error.issues.map((i) => i.path[0]).sort(),
        "mã sai khuôn và tên rỗng báo đúng ô",
      ).toStrictEqual(["code", "name"]);
    }
  });
});
