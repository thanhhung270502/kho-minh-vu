/**
 * File mẫu đếm kiểm kê (D-08). CHỈ CHẠY Ở SERVER (Route Handler `/api/kiem-ke/mau-excel`).
 *
 * KHÔNG dùng `import "server-only"` — cùng lý do `read-stock-file.server.ts`:
 * `scripts/test-excel-reader.ts` phải import được. Hàng rào thật là `node:stream`
 * bên trong `@/shared/lib/excel-cell`/`exceljs` — import nhầm vào Client Component
 * là build hỏng ngay.
 */
import ExcelJS from "exceljs";

export type StocktakeTemplateColumnKey = "ma_hang" | "ten_hang" | "ton" | "ton_thuc_te";

export type StocktakeTemplateColumn = {
  key: StocktakeTemplateColumnKey;
  title: string;
  width: number;
};

/**
 * Cùng bốn cột với phiếu in "Kiểm kho" (0129): người dùng chọn hiện số sổ để người
 * đếm so ngay (12/10/2026) — thay quyết định cũ D-08 giấu số sổ. Chỉ cột "Tồn thực tế"
 * được đọc khi nạp lại; "Tồn" là số sổ lúc tải file, sửa cũng không có tác dụng.
 */
export const STOCKTAKE_TEMPLATE_COLUMNS: readonly StocktakeTemplateColumn[] = [
  { key: "ma_hang", title: "Mã hàng", width: 22 },
  { key: "ten_hang", title: "Tên hàng", width: 40 },
  { key: "ton", title: "Tồn", width: 12 },
  { key: "ton_thuc_te", title: "Tồn thực tế", width: 14 },
] as const;

export type StocktakeTemplateRow = {
  code: string;
  name: string;
  /** Tồn sổ của kho phiên lúc tải file. null = người tải không có quyền Xem tồn kho (0128). */
  stock: number | null;
};

export type StocktakeTemplateMeta = {
  sessionNo: string;
  warehouseName: string;
  /** Nhãn phạm vi in vào sheet Hướng dẫn và tên sheet: tên nhóm, "N mã chọn" hoặc null (toàn kho). */
  categoryName: string | null;
};

/** Ký tự Excel cấm dùng trong tên sheet: [ ] : * ? / \ */
const FORBIDDEN_SHEET_CHARS = /[[\]:*?/\\]/g;
const MAX_SHEET_NAME_LENGTH = 31;

function sheetTitle(categoryName: string | null): string {
  const raw = (categoryName ?? "Toàn kho").replace(FORBIDDEN_SHEET_CHARS, "").trim();
  return (raw || "Toan kho").slice(0, MAX_SHEET_NAME_LENGTH);
}

const GUIDE_ROWS: Array<[string, string]> = [
  ["Chỉ điền cột Tồn thực tế", "Cột Tồn là số trên sổ lúc tải file — để đối chiếu, sửa cũng không có tác dụng."],
  [
    "Để trống = chưa đếm",
    "Ô Tồn thực tế để trống nghĩa là mã hàng đó CHƯA ĐẾM — không phải đếm được 0.",
  ],
  [
    "Không đổi tên cột, không thêm sheet phía trước",
    "Hệ chỉ đọc sheet đầu tiên và nhận diện cột theo đúng tên tiêu đề.",
  ],
  ["Mỗi mã một dòng", "Không tách một mã hàng thành nhiều dòng."],
];

/**
 * Xuất file mẫu đếm cho MỘT phiên/MỘT nhóm hàng (mỗi nhóm một file — Pitfall 4,
 * `readFirstSheet` chỉ đọc sheet đầu nên KHÔNG gộp nhiều nhóm vào nhiều sheet).
 * Sheet 1 là dữ liệu để đếm, sheet 2 là hướng dẫn.
 */
export async function buildCountTemplate(
  rows: StocktakeTemplateRow[],
  meta: StocktakeTemplateMeta,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kho Minh Vũ";
  wb.created = new Date();

  // Không có quyền Xem tồn kho (0128) thì mọi dòng tồn null — bỏ hẳn cột Tồn, không ghi 0.
  const showStock = rows.some((row) => row.stock !== null);
  const columns = STOCKTAKE_TEMPLATE_COLUMNS.filter((c) => showStock || c.key !== "ton");

  const ws = wb.addWorksheet(sheetTitle(meta.categoryName));
  ws.columns = columns.map((c) => ({
    header: c.title,
    key: c.key,
    width: c.width,
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  const soDemColIndex = columns.findIndex((c) => c.key === "ton_thuc_te") + 1;
  ws.getRow(1).getCell(soDemColIndex).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF2CC" },
  };

  for (const row of rows) {
    const added = ws.addRow({
      ma_hang: row.code,
      ten_hang: row.name,
      ton: row.stock,
      ton_thuc_te: null,
    });
    added.getCell(soDemColIndex).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF9E6" },
    };
  }

  const guide = wb.addWorksheet("Hướng dẫn");
  guide.columns = [
    { header: "Mục", key: "muc", width: 32 },
    { header: "Nội dung", key: "noi_dung", width: 80 },
  ];
  guide.getRow(1).font = { bold: true };
  guide.addRow({ muc: "Phiên kiểm kê", noi_dung: meta.sessionNo });
  guide.addRow({ muc: "Kho", noi_dung: meta.warehouseName });
  guide.addRow({ muc: "Phạm vi", noi_dung: meta.categoryName ?? "Toàn kho" });
  for (const [muc, noiDung] of GUIDE_ROWS) guide.addRow({ muc, noi_dung: noiDung });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
