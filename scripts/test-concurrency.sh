#!/usr/bin/env bash
#
# Test đồng thời cho trigger giá vốn và hàm đánh số chứng từ.
#
#   npm run test:dong-thoi
#
# VÌ SAO PHẢI LÀ SCRIPT RIÊNG, KHÔNG NẰM TRONG pgTAP:
# pgTAP chạy mọi thứ trong MỘT transaction rồi rollback. Hai câu INSERT tuần tự
# trong cùng transaction KHÔNG test được race condition — chúng vốn đã tuần tự.
# Phải có hai kết nối thật, transaction chồng nhau.
#
# LỖI NÓ SĂN:
# Trigger cap_nhat_ton_va_gia_von phải khóa dòng san_pham (FOR UPDATE) TRƯỚC khi
# đọc tổng ton_kho. Đảo thứ tự hai bước đó tạo lost update: hai phiếu nhập cùng
# mã chạy gần như đồng thời, cả hai đọc trạng thái cũ, một bản ghi cost bị mất.
# Lỗi này KHÔNG lộ ra ở bất kỳ test một-transaction nào, chỉ lộ dưới tải thật —
# và lúc đó đã lệch tiền nhiều tháng.
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi

if [ -z "${DATABASE_URL:-}" ]; then
  cat >&2 <<'HELP'
Thiếu DATABASE_URL trong .env.local.

Lấy ở đâu: Supabase Dashboard > nút "Connect" (góc trên) > tab "Session pooler"
hoặc "Direct connection" > copy chuỗi URI, thay [YOUR-PASSWORD] bằng
SUPABASE_DB_PASSWORD.

Thêm vào .env.local:
  DATABASE_URL=postgresql://postgres.<ref>:<mat-khau>@<host>:5432/postgres

Lưu ý: phải dùng SESSION pooler hoặc direct connection (cổng 5432).
Transaction pooler (cổng 6543) không giữ được advisory lock giữa các câu lệnh.
HELP
  exit 1
fi

MA_TEST="CONCURRENCY-TEST"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -t -A)

echo "═══ TEST ĐỒNG THỜI ═══"
echo

# ─── Dọn dữ liệu test cũ nếu còn sót ────────────────────────────────────────
# session_replication_role=replica tắt trigger CHỈ TRONG PHIÊN NÀY. Phiên kết
# thúc là tự khôi phục — an toàn hơn ALTER TABLE ... DISABLE TRIGGER vốn có hiệu
# lực toàn cục và nằm lại nếu script chết giữa chừng.
don_dep() {
  "${PSQL[@]}" >/dev/null <<SQL || echo "  (không dọn được dữ liệu test — cần quyền postgres)" >&2
set session_replication_role = replica;
delete from public.kho_movement
  where san_pham_id in (select id from public.san_pham where ma_hang = '$MA_TEST');
delete from public.ton_kho
  where san_pham_id in (select id from public.san_pham where ma_hang = '$MA_TEST');
delete from public.san_pham where ma_hang = '$MA_TEST';
delete from public.chuoi_so_ct where loai_ct = 'DIEU_CHINH' and nam = 2099;
set session_replication_role = origin;
SQL
}

trap don_dep EXIT

don_dep
echo "→ Dựng dữ liệu: 1 sản phẩm, tồn 10 @ giá vốn 100"

"${PSQL[@]}" >/dev/null <<SQL
insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
values ('$MA_TEST', 'Hàng test đồng thời',
        (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'MUA_NGOAI'));

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
values ((select id from public.kho where ma = 'K1'),
        (select id from public.san_pham where ma_hang = '$MA_TEST'), 10, 100);
SQL

# ─── PHẦN 1: giá vốn dưới hai transaction chồng nhau ───────────────────────
echo
echo "PHẦN 1 — Giá vốn bình quân"
echo "  Kết nối A: BEGIN, nhập 10@200, giữ transaction 3 giây, COMMIT"
echo "  Kết nối B: 1 giây sau, BEGIN, nhập 10@200, COMMIT"
echo "  → B phải ĐỢI A commit rồi mới tính, nếu khóa đúng thứ tự."

"${PSQL[@]}" >/dev/null <<SQL &
begin;
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
values ((select id from public.kho where ma = 'K1'),
        (select id from public.san_pham where ma_hang = '$MA_TEST'), 10, 200);
select pg_sleep(3);
commit;
SQL
PID_A=$!

sleep 1

"${PSQL[@]}" >/dev/null <<SQL
begin;
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
values ((select id from public.kho where ma = 'K1'),
        (select id from public.san_pham where ma_hang = '$MA_TEST'), 10, 200);
commit;
SQL

wait $PID_A

GIA_VON=$("${PSQL[@]}" -c "select gia_von from public.san_pham where ma_hang = '$MA_TEST';")
TON=$("${PSQL[@]}" -c "select so_luong from public.ton_kho tk join public.san_pham sp on sp.id = tk.san_pham_id where sp.ma_hang = '$MA_TEST';")

echo
echo "  Tồn      : $TON        (cần 30)"
echo "  Giá vốn  : $GIA_VON  (cần 166.6667)"
echo

LOI=0

if [ "$TON" != "30.0000" ]; then
  echo "  ✗ TỒN SAI — một movement bị mất."
  LOI=1
fi

case "$GIA_VON" in
  166.6667)
    echo "  ✓ Giá vốn đúng: (20×150 + 10×200) / 30 = 166.6667"
    echo "    B đã đợi A commit rồi mới đọc — thứ tự khóa đúng."
    ;;
  150.0000)
    echo "  ✗ LOST UPDATE. Cả hai transaction cùng đọc trạng thái cũ (tồn 10, giá 100)."
    echo "    Nguyên nhân: trigger đọc tổng ton_kho TRƯỚC khi khóa dòng san_pham."
    echo "    Sửa: đưa 'select gia_von ... for update' lên làm câu lệnh ĐẦU TIÊN"
    echo "    trong cap_nhat_ton_va_gia_von (migration 0008)."
    LOI=1
    ;;
  175.0000)
    echo "  ✗ Đọc tồn cũ trước khi khóa: (10×150 + 10×200) / 20 = 175."
    echo "    Cùng nguyên nhân như trên — sai thứ tự hai bước đầu của trigger."
    LOI=1
    ;;
  *)
    echo "  ✗ Giá vốn không khớp kịch bản nào đã biết. Xem lại trigger."
    LOI=1
    ;;
esac

# ─── PHẦN 2: đánh số chứng từ từ hai kết nối song song ────────────────────
echo
echo "PHẦN 2 — Đánh số chứng từ"
echo "  Hai kết nối cùng gọi sinh_so_ct 50 lần (25 mỗi bên)."

sinh_so() {
  "${PSQL[@]}" -c "select public.sinh_so_ct('DIEU_CHINH', 2099::smallint) from generate_series(1, 25);"
}

SO_A=$(sinh_so) &
PID_S=$!
SO_B=$(sinh_so)
wait $PID_S || true

TONG=$("${PSQL[@]}" -c "select so_hien_tai from public.chuoi_so_ct where loai_ct = 'DIEU_CHINH' and nam = 2099;")

echo
echo "  Bộ đếm sau 50 lần gọi: $TONG  (cần 50)"

if [ "$TONG" = "50" ]; then
  echo "  ✓ Không số nào bị trùng hay nhảy cóc."
  echo "    INSERT ... ON CONFLICT DO UPDATE ... RETURNING serialize đúng trên khóa dòng."
else
  echo "  ✗ Bộ đếm sai. Hai phiên đã đọc cùng một giá trị — số chứng từ sẽ trùng."
  echo "    Kiểm lại sinh_so_ct (migration 0009): phải là MỘT câu lệnh"
  echo "    INSERT ... ON CONFLICT DO UPDATE ... RETURNING, không phải SELECT rồi UPDATE."
  LOI=1
fi

echo
if [ "$LOI" = "0" ]; then
  echo "═══ TẤT CẢ ĐÚNG ═══"
else
  echo "═══ CÓ LỖI — xem chi tiết ở trên ═══"
fi
echo "(dữ liệu test sẽ được dọn khi script kết thúc)"
exit "$LOI"
