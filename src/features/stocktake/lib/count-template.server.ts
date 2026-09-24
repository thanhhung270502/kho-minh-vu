/**
 * File mẫu đếm kiểm kê (D-08). CHỈ CHẠY Ở SERVER (Route Handler `/api/kiem-ke/mau-excel`).
 *
 * KHÔNG dùng `import "server-only"` — cùng lý do `read-stock-file.server.ts`:
 * `scripts/test-excel-reader.ts` phải import được. Hàng rào thật là `node:stream`
 * bên trong `@/shared/lib/excel-cell`/`exceljs` — import nhầm vào Client Component
 * là build hỏng ngay.
 */
import ExcelJS from "exceljs";

export type StocktakeTemplateColumnKey = "ma_hang" | "ten_hang" | "dvt" | "so_dem";

export type StocktakeTemplateColumn = {
  key: StocktakeTemplateColumnKey;
  title: string;
  width: number;
};

/**
 * KHÔNG thêm cột số liệu hệ thống nào (D-08, T-06-56) — file mẫu đếm đầu kỳ/định
 * kỳ không được lộ số sổ sách, tránh người đếm chép theo số có sẵn thay vì đếm
 * thật.
 */
export const STOCKTAKE_TEMPLATE_COLUMNS: readonly StocktakeTemplateColumn[] = [
  { key: "ma_hang", title: "Mã hàng", width: 22 },
  { key: "ten_hang", title: "Tên hàng", width: 40 },
  { key: "dvt", title: "ĐVT", width: 10 },
  { key: "so_dem", title: "Số đếm", width: 12 },
] as const;

export type StocktakeTemplateRow = {
  code: string;
  name: string;
  unit: string | null;
};

export type StocktakeTemplateMeta = {
  sessionNo: string;
  warehouseName: string;
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
  ["Chỉ điền cột Số đếm", "Các cột còn lại chỉ để đối chiếu, không cần sửa."],
  [
    "Để trống = chưa đếm",
    "Ô Số đếm để trống nghĩa là mã hàng đó CHƯA ĐẾM — không phải đếm được 0.",
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

  const ws = wb.addWorksheet(sheetTitle(meta.categoryName));
  ws.columns = STOCKTAKE_TEMPLATE_COLUMNS.map((c) => ({
    header: c.title,
    key: c.key,
    width: c.width,
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: STOCKTAKE_TEMPLATE_COLUMNS.length },
  };

  const soDemColIndex =
    STOCKTAKE_TEMPLATE_COLUMNS.findIndex((c) => c.key === "so_dem") + 1;
  ws.getRow(1).getCell(soDemColIndex).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF2CC" },
  };

  for (const row of rows) {
    const added = ws.addRow({
      ma_hang: row.code,
      ten_hang: row.name,
      dvt: row.unit,
      so_dem: null,
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
  guide.addRow({ muc: "Nhóm hàng", noi_dung: meta.categoryName ?? "Toàn kho" });
  for (const [muc, noiDung] of GUIDE_ROWS) guide.addRow({ muc, noi_dung: noiDung });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
