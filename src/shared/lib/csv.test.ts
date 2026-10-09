import { describe, expect, it } from "vitest";
import { buildCsv } from "@/shared/lib/csv";

describe("csv", () => {
  it("CSV chung có BOM, bọc nháy và nhân đôi nháy", async () => {
    const blob = buildCsv(
      ["Mã", "Ghi chú"],
      [
        ["A1", 'có "nháy", dấu phẩy'],
        ["B2", 3],
      ],
    );
    const byte = new Uint8Array(await blob.arrayBuffer());
    expect([...byte.slice(0, 3)], "CSV chung có BOM").toStrictEqual([
      0xef, 0xbb, 0xbf,
    ]);
    const text = await blob.text();
    expect(
      text.includes('"có ""nháy"", dấu phẩy"'),
      "bọc nháy + nhân đôi nháy",
    ).toBeTruthy();
  });
});
