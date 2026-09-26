/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const imageKeys = {
  all: ["images"] as const,
  product: (productId: string) => ["images", "product", productId] as const,
};
