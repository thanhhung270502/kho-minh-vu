# Dữ liệu đối chiếu quy chuẩn mã (không commit)

`npx tsx scripts/test-product-codes.ts` cần hai file trong thư mục này:

- `danh-muc-hang-hoa.xlsx` — danh mục 3.311 mã, cột L–P (Hãng xe, Dòng xe, Linh kiện,
  Xử lý, Ghi chú) sinh bằng công thức sheet TRA_CUU. Đây là đáp án để đối chiếu.
- `quy-chuan-ma.csv` — bản chụp sheet "Quy chuẩn mã". Chạy kèm `--tai-moi` để tải lại
  từ Google Sheet (biến `MA_HOA_SHEET_ID`, mặc định file trung gian công khai).

Từ điển đổi so với lúc sinh file Excel thì có thể lệch vài mã — script in rõ từng mã lệch.
