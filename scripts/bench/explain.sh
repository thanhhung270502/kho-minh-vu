#!/usr/bin/env bash
# EXPLAIN thật của câu lồng trong RPC (auto_explain) trên Supabase LOCAL. Kết quả: bench/explain-<nhãn>.txt
set -euo pipefail
cd "$(dirname "$0")/../.."
LABEL=${1:?"Cách dùng: npm run bench:explain -- <nhãn>"}
[[ "$LABEL" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Nhãn chỉ gồm a-z, 0-9, dấu gạch" >&2; exit 1; }
STATUS=$(npx supabase status -o env 2>/dev/null)
API=$(printf '%s\n' "$STATUS" | sed -n 's/^API_URL="\(.*\)"$/\1/p')
DB_URL=$(printf '%s\n' "$STATUS" | sed -n 's/^DB_URL="\(.*\)"$/\1/p')
case "$API" in http://127.0.0.1:*|http://localhost:*) ;; *) echo "Chỉ chạy trên Supabase LOCAL, nhận API_URL='$API'" >&2; exit 1;; esac
case "$DB_URL" in postgresql://*@127.0.0.1:*|postgresql://*@localhost:*) ;; *) echo "Chỉ chạy trên Supabase LOCAL, nhận DB_URL host khác 127.0.0.1/localhost" >&2; exit 1;; esac
# Chọn container theo CỔNG đã publish của DB_URL (không suy tên từ config.toml — project_id ở đó khác ref của container).
PORT=$(printf '%s\n' "$DB_URL" | sed -E 's#^postgresql://[^@]*@[^:/]+:([0-9]+)/.*#\1#')
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "Không đọc được cổng từ DB_URL" >&2; exit 1; }
MATCHES=$(docker ps --filter "publish=$PORT" --filter name=supabase_db_ --format '{{.Names}}')
N=$(printf '%s' "$MATCHES" | grep -c . || true)
[ "$N" -eq 1 ] || { echo "Cần đúng 1 container supabase_db_* publish cổng $PORT, thấy $N: $MATCHES" >&2; exit 1; }
C=$MATCHES
OUT=.planning/phases/22-toi-uu-du-lieu-lon/bench/explain-$LABEL.txt
mkdir -p "$(dirname "$OUT")"
docker exec -i "$C" psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < scripts/bench/explain.sql > "$OUT" 2>&1
echo "Đã ghi $OUT ($(grep -c '=== CASE:' "$OUT") ca)"
