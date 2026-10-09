import { describe, expect, it } from "vitest";
import { toDocumentUpdate } from "@/features/documents/schemas/document.schema";

describe("document.schema", () => {
  it("toDocumentUpdate không đụng trường khác", () => {
    expect(toDocumentUpdate({ note: "x" })).toStrictEqual({ ghi_chu: "x" });
  });
});
