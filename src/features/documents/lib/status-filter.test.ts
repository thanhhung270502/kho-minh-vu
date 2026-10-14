import { describe, expect, it } from "vitest";

import {
  DEFAULT_DOC_STATUSES,
  docStatusesToRpc,
  readDocStatuses,
  toggleDocStatus,
  writeDocStatuses,
} from "@/features/documents/lib/status-filter";

describe("status-filter", () => {
  it("đọc/ghi trạng thái trên URL, mặc định ẩn Đã hủy", () => {
    expect(readDocStatuses(null), "URL trống → mặc định").toStrictEqual(["NHAP_LIEU", "HOAN_THANH"]);
    expect(readDocStatuses("DA_HUY"), "bookmark cũ một giá trị vẫn đọc được").toStrictEqual(["DA_HUY"]);
    expect(readDocStatuses("DA_HUY,NHAP_LIEU"), "giữ thứ tự chuẩn").toStrictEqual(["NHAP_LIEU", "DA_HUY"]);
    expect(readDocStatuses("XYZ,"), "không giá trị hợp lệ → mặc định").toStrictEqual(DEFAULT_DOC_STATUSES);
    expect(writeDocStatuses(DEFAULT_DOC_STATUSES), "mặc định không ghi lên URL").toBe(null);
    expect(writeDocStatuses(["HOAN_THANH", "DA_HUY"])).toBe("HOAN_THANH,DA_HUY");
  });

  it("đủ ba trạng thái = không lọc; luôn giữ ít nhất một ô tích", () => {
    expect(docStatusesToRpc(["NHAP_LIEU", "HOAN_THANH", "DA_HUY"])).toBe(undefined);
    expect(docStatusesToRpc(["HOAN_THANH"])).toStrictEqual(["HOAN_THANH"]);
    expect(toggleDocStatus(["NHAP_LIEU", "HOAN_THANH"], "DA_HUY")).toStrictEqual(["NHAP_LIEU", "HOAN_THANH", "DA_HUY"]);
    expect(toggleDocStatus(["HOAN_THANH"], "NHAP_LIEU"), "chèn đúng thứ tự").toStrictEqual(["NHAP_LIEU", "HOAN_THANH"]);
    expect(toggleDocStatus(["HOAN_THANH"], "HOAN_THANH"), "bỏ ô cuối cùng bị chặn").toBe(null);
  });
});
