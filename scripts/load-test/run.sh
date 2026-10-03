#!/usr/bin/env bash
#
# Load test: nạp dữ liệu LOADTEST → bắn tải tăng dần → dọn sạch (kể cả khi Ctrl+C).
#
#   npm run test:load                                  # bậc mặc định, đọc .env.local
#   ENV_FILE=.env.cloud.backup npm run test:load -- 5:45 25:45 50:45
#   SITE=https://kho-minh-vu.vercel.app npm run test:load
#
# Cần trong ENV_FILE: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SEED_USER_PASSWORD (tài khoản mẫu của `npm run seed:users`), DATABASE_URL
# (session pooler cổng 5432 hoặc direct — để nạp/dọn dữ liệu thử).
#
# DỮ LIỆU THỬ: 1 khách LOADTEST-KH + 50 mã LOADTEST-001..050 tồn 1.000.000 ở K1.
# Phiếu xuất thử chỉ dùng các mã này nên không đụng tồn/giá vốn hàng thật.
# cleanup.sql xóa mọi phiếu/movement của chúng và trả bộ đếm số phiếu XUAT.
#
# BẪY ĐÃ GẶP: .env.cloud.backup trỏ project phonzy…, còn kho-minh-vu.vercel.app
# dùng rnpq… — trang SITE sẽ trả 307 về /dang-nhap vì phiên thuộc project khác.
# Script so ref hai bên và cảnh báo trước khi chạy.
#
set -euo pipefail

cd "$(dirname "$0")/../.."
DIR=scripts/load-test
ENV_FILE=${ENV_FILE:-.env.local}

if [ ! -f "$ENV_FILE" ]; then echo "Không thấy $ENV_FILE" >&2; exit 1; fi
set -a; . "./$ENV_FILE"; set +a

for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SEED_USER_PASSWORD DATABASE_URL; do
  if [ -z "${!v:-}" ]; then echo "Thiếu $v trong $ENV_FILE" >&2; exit 1; fi
done

SITE=${SITE:-https://kho-minh-vu.vercel.app}
DB_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's#https?://([^.]+)\..*#\1#')
SITE_REF=$(curl -s "$SITE/dang-nhap" | grep -oE '/_next/static/[^"]+\.js' | sort -u \
  | while read -r c; do curl -s "$SITE$c" | grep -oE '[a-z]{20}\.supabase\.co'; done \
  | head -1 | cut -d. -f1 || true)

echo "Supabase của ENV_FILE : $DB_REF"
echo "Supabase của $SITE : ${SITE_REF:-không xác định}"
if [ -n "$SITE_REF" ] && [ "$SITE_REF" != "$DB_REF" ]; then
  echo "⚠  Hai project khác nhau — phần đo trang SITE sẽ toàn 307. Đo API vẫn đúng cho $DB_REF."
fi

PSQL=(psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1)
trap 'echo; echo "→ Dọn dữ liệu LOADTEST"; "${PSQL[@]}" -f $DIR/cleanup.sql' EXIT

echo "→ Nạp dữ liệu LOADTEST"
"${PSQL[@]}" -f $DIR/setup.sql >/dev/null

STAGES=("$@")
if [ ${#STAGES[@]} -eq 0 ]; then STAGES=(5:45 10:45 25:45 50:45 100:45); fi

SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
SEED_PASSWORD=$SEED_USER_PASSWORD \
SITE=$SITE \
  node $DIR/load.mjs "${STAGES[@]}"
