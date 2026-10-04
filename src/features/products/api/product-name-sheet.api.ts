import { z } from "zod";

const responseSchema = z.object({
  names: z.array(z.tuple([z.string(), z.string()])),
  error: z.string().nullable(),
});

export type ProductNameLookup = { names: Map<string, string>; error: string | null };

/** Khóa của `names` là mã đã hạ chữ thường (readProductNameSheet). */
export async function fetchProductNameSheet(): Promise<ProductNameLookup> {
  const response = await fetch("/api/danh-muc/ten-hang-chuan");
  if (!response.ok) throw new Error(`Không tải được sheet tên hàng chuẩn (HTTP ${response.status})`);
  const body = responseSchema.parse(await response.json());
  return { names: new Map(body.names), error: body.error };
}
