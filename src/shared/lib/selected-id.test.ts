import { describe, expect, it } from "vitest";
import {
  isInteractiveTarget,
  readSelectedId,
  withSelectedId,
} from "@/shared/lib/selected-id";

describe("selected-id", () => {
  it("mã đang chọn trên URL ?chon= (Phase 14, PANEL-01..03)", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(readSelectedId(new URLSearchParams(`chon=${id}`))).toBe(id);
    expect(
      readSelectedId(new URLSearchParams("chon=abc")),
      "không phải uuid: bỏ",
    ).toBe(null);
    expect(readSelectedId(new URLSearchParams(""))).toBe(null);

    const base = new URLSearchParams("q=op&nhom=x&trang=2");
    const opened = withSelectedId(base, id);
    expect(opened.get("chon")).toBe(id);
    expect(opened.get("q"), "giữ nguyên bộ lọc đang có").toBe("op");
    expect(opened.get("trang")).toBe("2");
    expect(base.get("chon"), "không sửa URLSearchParams gốc").toBe(null);
    expect(
      withSelectedId(opened, null).get("chon"),
      "đóng panel: bỏ chon",
    ).toBe(null);

    // Bấm vào ô chọn, ô sửa nhanh, ảnh, nút, link… KHÔNG mở panel.
    const el = (hit: boolean) => ({ closest: () => (hit ? {} : null) });
    expect(isInteractiveTarget(el(true)), "bấm vào phần tử tương tác").toBe(
      true,
    );
    expect(isInteractiveTarget(el(false)), "bấm vào chữ thường của dòng").toBe(
      false,
    );
    expect(isInteractiveTarget(null)).toBe(false);
  });
});
