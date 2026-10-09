"""Nạp phần chênh 09/10 (chạy từ gốc repo): 4 mã mới, 18 hóa đơn thiếu dòng (phiếu -BS), 12 hóa đơn mới,
rồi chốt tồn = cột Tồn kho của file danh mục. Một khối DO = một transaction.
  python nap_bo_sung.py [--ghi]   (mặc định chạy thử: RAISE ở cuối → cuộn lại)"""
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
from collections import defaultdict
from datetime import date, datetime

import openpyxl

ROOT = r"C:\Users\ADM\Desktop\kho-minh-vu"
OUT = os.path.join(ROOT, ".nap-tam")
os.makedirs(OUT, exist_ok=True)
NPX = shutil.which("npx.cmd") or shutil.which("npx")
DM = r"D:\Downloads\danh-muc-20261009-0147.xlsx"
HD = r"D:\Downloads\Process data\Duyệt đơn\Danh sách hóa đơn\DanhSachChiTietHoaDon_Da_process.xlsx"
GHI = "--ghi" in sys.argv
OPENING_DATE = "2026-06-14"
NOTE_CHOT = "Chốt tồn theo danh mục 09/10 (số thật đã cộng trừ) — sau khi nạp bổ sung hóa đơn"


def db_url():
    for line in open(os.path.join(ROOT, ".env.local"), encoding="utf-8"):
        if line.startswith("DATABASE_URL="):
            v = line.split("=", 1)[1].strip().strip('"')
            m = re.match(r"^(postgres(?:ql)?://)([^:]+):(.*)@([^:/]+)(.*)$", v)
            h = m.group(4)
            if h.endswith(".supabase.co"):
                h = h[:-3] + ".com"
            return m.group(1) + m.group(2) + ":" + urllib.parse.quote(urllib.parse.unquote(m.group(3)), safe="") + "@" + h + m.group(5)


def q(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(float(v)) if isinstance(v, float) else str(v)
    s = str(v).strip()
    return "null" if s == "" else "'" + s.replace("'", "''") + "'"


def as_date(v):
    return v.date().isoformat() if isinstance(v, datetime) else v.isoformat() if isinstance(v, date) else str(v)[:10]


def sheet(path):
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
    it = ws.iter_rows(values_only=True)
    h = [str(x).strip() for x in next(it)]
    return [dict(zip(h, r)) for r in it if any(v is not None for v in r)]


def query(sql):
    f = os.path.join(OUT, "_truy-van.sql")
    open(f, "w", encoding="utf-8", newline="\n").write(sql)
    p = subprocess.run([NPX, "supabase", "db", "query", "--db-url", db_url(), "--output-format", "json", "-f", f],
                       cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    i = p.stdout.find("{")
    return json.loads(p.stdout[i:]).get("rows", []) if i >= 0 else p.stdout


dm = sheet(DM)
hd_rows = sheet(HD)
existing = {r["so_ct"] for r in query("select so_ct from public.chung_tu where loai_ct = 'XUAT'")}
codes = {r["ma"] for r in query("select upper(ma_hang) ma from public.san_pham")}
new_codes = [r for r in dm if str(r["Mã hàng"]).strip().upper() not in codes]
NEW4 = {str(r["Mã hàng"]).strip().upper() for r in new_codes}
all_codes = codes | NEW4

# Mã mới: hàng nạp cho nhap_danh_muc (khóa jsonb là hợp đồng RPC). "xi" = Xi mạ; ĐVT lỗi = Cái.
cat_rows = []
for i, r in enumerate(new_codes):
    unit = r["Đơn vị tính"] if isinstance(r["Đơn vị tính"], str) and r["Đơn vị tính"].strip() else "Cái"
    stage = r["Xử lý"]
    stage = "XI_MA" if isinstance(stage, str) and stage.strip().lower() == "xi" else stage
    row = {"dong": i + 2, "ma_hang": str(r["Mã hàng"]).strip(), "ten_hang": r["Tên hàng"], "nhom_hang": r["Nhóm hàng"],
           "dvt": unit, "dang_kinh_doanh": r["Đang kinh doanh"] not in (0, "0", False), "mo_ta": r["Mô tả"],
           "kho_mac_dinh": r["Vị trí"]}
    if stage:
        row["cong_doan"] = stage
    else:
        row["cong_doan_khi_tao_moi"] = "MUA_NGOAI"
    cat_rows.append(row)

# Hóa đơn: mới (chưa có) và dòng thiếu của 18 hóa đơn đã có (chỉ dòng mã mới).
heads, lines, bs_lines = {}, [], []
for n, r in enumerate(hd_rows):
    so = str(r["Mã hóa đơn"]).strip()
    code = str(r["Mã hàng"] or "").strip()
    if not code or "{DEL}" in code or code.upper() not in all_codes:
        continue
    if so in existing:
        if code.upper() in NEW4:
            bs_lines.append((so, n, code, r["Số lượng"], r["Ghi chú dòng"]))
        continue
    heads.setdefault(so, (so, as_date(r["Ngày"]), r["Mã đặt hàng"], r["Mã khách hàng"], r["Người duyệt đơn"],
                          r["Người tạo"], r["Ghi chú"], "hủy" in str(r["Trạng thái"] or "").lower()))
    lines.append((so, n, code, r["Số lượng"], r["Ghi chú dòng"]))

targets = [(str(r["Mã hàng"]).strip(), float(r["Tồn kho"] or 0)) for r in dm]


def vals(rs):
    return ",\n".join("(" + ", ".join(q(v) for v in row) + ")" for row in rs)


AS_MANAGER = """perform set_config('request.jwt.claims', json_build_object(
  'sub', (select id from public.nguoi_dung where ten_dang_nhap = 'quanly'),
  'role', 'authenticated', 'vai_tro', 'quan_ly')::text, true);"""

POST = """  begin
    perform public.ghi_so_chung_tu(r.id);
  exception when others then
    if sqlerrm ilike '%xuất âm%' or sqlerrm ilike '%quá tồn%' then
      update public.chung_tu set ly_do_xuat_am = 'LECH_TON_CHO_KIEM_KE' where id = r.id;
      perform public.ghi_so_chung_tu(r.id);
    else raise; end if;
  end;"""

sql = f"""do $nap$
declare v text; vi int; vd text; r record; v_ct uuid; kq jsonb;
begin
{AS_MANAGER}
create temp table _hd (so text primary key, ngay date, ma_dh text, ma_kh text, duyet text, tao text, ghi_chu text, huy boolean) on commit drop;
create temp table _dong (so text, thu_tu int, ma_hang text, so_luong numeric, ghi_chu text) on commit drop;
create temp table _bs (so text, thu_tu int, ma_hang text, so_luong numeric, ghi_chu text) on commit drop;
create temp table _dich (ma_hang text, ton numeric) on commit drop;
create temp table _kq (buoc text, so bigint) on commit drop;
{"insert into _hd values " + vals(heads.values()) + ";" if heads else ""}
{"insert into _dong values " + vals(lines) + ";" if lines else ""}
{"insert into _bs values " + vals(bs_lines) + ";" if bs_lines else ""}
insert into _dich values {vals(targets)};

-- 1. Mã mới qua đúng hàm nạp danh mục của app.
kq := public.nhap_danh_muc({q(json.dumps(cat_rows, ensure_ascii=False, default=str))}::jsonb, false);
if jsonb_array_length(kq->'loi') > 0 then raise exception 'Mã mới lỗi: %', kq->'loi'; end if;
insert into _kq values ('ma_moi', (kq->>'them')::bigint);

-- 2. Hóa đơn mới (nháp) + phiếu bổ sung -BS cho hóa đơn thiếu dòng.
insert into public.chung_tu (so_ct, loai_ct, kho_id, ngay_ct, doi_tac_id, ghi_chu, nguoi_tao_id)
select h.so, 'XUAT', (select id from public.kho where ma = 'K1'), h.ngay,
       (select id from public.doi_tac where upper(ma) = upper(coalesce(h.ma_kh, 'NB001'))),
       nullif(concat_ws(' · ', nullif(trim(h.ghi_chu), ''), 'Người bán: ' || nullif(trim(h.duyet), '')), ''),
       (select id from public.nguoi_dung where lower(trim(ho_ten)) = lower(trim(h.tao)))
from _hd h;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, ghi_chu, created_at)
select ct.id, sp.id, d.so_luong, 0, 0, coalesce(sp.kho_mac_dinh_id, ct.kho_id), nullif(trim(d.ghi_chu), ''), now() + make_interval(secs => d.thu_tu / 1000000.0)
from _dong d join public.chung_tu ct on ct.so_ct = d.so and ct.loai_ct = 'XUAT' join public.san_pham sp on upper(sp.ma_hang) = upper(d.ma_hang);

insert into public.chung_tu (so_ct, loai_ct, kho_id, ngay_ct, doi_tac_id, ghi_chu, nguoi_tao_id)
select g.so_ct || '-BS', 'XUAT', g.kho_id, g.ngay_ct, g.doi_tac_id,
       'Bổ sung dòng mã mới tạo 09/10 cho ' || g.so_ct || coalesce(' · ' || public.tach_nguoi_ban(g.ghi_chu), ''), g.nguoi_tao_id
from public.chung_tu g where g.loai_ct = 'XUAT' and g.so_ct in (select distinct so from _bs);
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, ghi_chu, created_at)
select ct.id, sp.id, b.so_luong, 0, 0, coalesce(sp.kho_mac_dinh_id, ct.kho_id), nullif(trim(b.ghi_chu), ''), now() + make_interval(secs => b.thu_tu / 1000000.0)
from _bs b join public.chung_tu ct on ct.so_ct = b.so || '-BS' and ct.loai_ct = 'XUAT' join public.san_pham sp on upper(sp.ma_hang) = upper(b.ma_hang);
insert into _kq select 'hoa_don_moi', count(*) from _hd;
insert into _kq select 'phieu_bo_sung', count(distinct so) from _bs;

-- 3. Ghi sổ theo ngày; hủy hóa đơn hủy trên KiotViet.
for r in select ct.id from public.chung_tu ct
         where ct.loai_ct = 'XUAT' and ct.trang_thai = 'NHAP_LIEU'
           and (ct.so_ct in (select so from _hd) or ct.so_ct in (select so || '-BS' from _bs))
         order by ct.ngay_ct, ct.so_ct loop
{POST}
end loop;
for r in select ct.id from public.chung_tu ct join _hd h on h.so = ct.so_ct where h.huy loop
  perform public.huy_chung_tu(r.id, 'Hóa đơn đã hủy trên KiotViet');
end loop;

-- 4. Đơn đặt: đơn mới cho hóa đơn mới; đơn cũ của hóa đơn có -BS thêm dòng; nối hóa đơn.
insert into public.don_dat_hang (so_dh, ngay_dh, trang_thai, doi_tac_id, ghi_chu, nguoi_tao_id, nguoi_xac_nhan_id, ngay_xac_nhan)
select distinct on (h.ma_dh) h.ma_dh, h.ngay, case when h.huy then 'DA_HUY' else 'HOAN_THANH' end::public.trang_thai_ddh,
       (select id from public.doi_tac where upper(ma) = upper(coalesce(h.ma_kh, 'NB001'))), nullif(trim(h.ghi_chu), ''),
       (select id from public.nguoi_dung where lower(trim(ho_ten)) = lower(trim(h.tao))),
       (select id from public.nguoi_dung where lower(trim(ho_ten)) = lower(trim(h.duyet))),
       (h.ngay::timestamp at time zone 'Asia/Ho_Chi_Minh')
from _hd h where h.ma_dh is not null and not exists (select 1 from public.don_dat_hang dh where dh.so_dh = h.ma_dh)
order by h.ma_dh, h.ngay;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, so_luong_da_xuat, don_gia, ghi_chu, created_at)
select dh.id, d.san_pham_id, d.so_luong, d.so_luong, 0, d.ghi_chu, d.created_at
from _hd h join public.don_dat_hang dh on dh.so_dh = h.ma_dh
join public.chung_tu ct on ct.so_ct = h.so and ct.loai_ct = 'XUAT' join public.chung_tu_dong d on d.chung_tu_id = ct.id
where not exists (select 1 from public.don_dat_hang_dong x where x.don_dat_hang_id = dh.id and x.created_at = d.created_at);
update public.chung_tu ct set don_dat_hang_id = dh.id from _hd h join public.don_dat_hang dh on dh.so_dh = h.ma_dh
where ct.so_ct = h.so and ct.loai_ct = 'XUAT' and ct.don_dat_hang_id is null;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, so_luong_da_xuat, don_gia, ghi_chu, created_at)
select g.don_dat_hang_id, d.san_pham_id, d.so_luong, d.so_luong, 0, d.ghi_chu, d.created_at
from public.chung_tu bs join public.chung_tu g on g.so_ct || '-BS' = bs.so_ct and g.loai_ct = 'XUAT'
join public.chung_tu_dong d on d.chung_tu_id = bs.id
where bs.so_ct in (select so || '-BS' from _bs) and g.don_dat_hang_id is not null;
-- Phiếu -BS không nối đơn: một đơn tối đa một hóa đơn (uq_chung_tu_hoa_don_cua_don); 0113 tự gộp -BS vào phiếu gốc.

-- 5. Chốt tồn = file danh mục: phiếu Điều chỉnh 14/06 bù đúng phần chênh, ở kho mặc định.
insert into public.chung_tu (so_ct, loai_ct, kho_id, ngay_ct, ghi_chu)
values (public.sinh_so_ct('DIEU_CHINH'), 'DIEU_CHINH', (select id from public.kho where ma = 'K1'), date '{OPENING_DATE}', '{NOTE_CHOT}')
returning id into v_ct;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select v_ct, sp.id, x.ton - coalesce((select sum(t.so_luong) from public.ton_kho t where t.san_pham_id = sp.id), 0), 0, 0,
       coalesce(sp.kho_mac_dinh_id, (select id from public.kho where ma = 'K1'))
from _dich x join public.san_pham sp on upper(sp.ma_hang) = upper(x.ma_hang)
where x.ton <> coalesce((select sum(t.so_luong) from public.ton_kho t where t.san_pham_id = sp.id), 0);
insert into _kq select 'dong_chot_ton', count(*) from public.chung_tu_dong where chung_tu_id = v_ct;
if exists (select 1 from public.chung_tu_dong where chung_tu_id = v_ct) then
  perform public.ghi_so_chung_tu(v_ct);
else
  delete from public.chung_tu where id = v_ct;
end if;

-- 5b. Bộ đếm số phải theo kịp số vừa ghi thẳng, nếu không "Tạo đơn" cấp lại số đã có (lỗi trùng 09/10).
update public.chuoi_so_dh set so_hien_tai = greatest(so_hien_tai,
  (select max(substring(so_dh from '^DH([0-9]+)$')::int) from public.don_dat_hang)) where nam = 0;
update public.chuoi_so_ct set so_hien_tai = greatest(so_hien_tai,
  (select max(substring(so_ct from '^HD([0-9]+)$')::int) from public.chung_tu where loai_ct = 'XUAT'))
where nam = 0 and loai_ct = 'XUAT';

-- 6. Kiểm: tồn từng mã = file; không còn phiếu nháp.
select count(*), string_agg(x, '; ') into vi, vd from (
  select x.ma_hang || ' file ' || x.ton || ' / he thong ' || coalesce((select sum(t.so_luong) from public.ton_kho t where t.san_pham_id = sp.id), 0) x
  from _dich x join public.san_pham sp on upper(sp.ma_hang) = upper(x.ma_hang)
  where x.ton <> coalesce((select sum(t.so_luong) from public.ton_kho t where t.san_pham_id = sp.id), 0) limit 10) s;
if vi > 0 then raise exception 'Tồn còn lệch % mã, vd: % — cuộn lại', vi, vd; end if;
if exists (select 1 from public.chung_tu where trang_thai = 'NHAP_LIEU' and (so_ct in (select so from _hd) or so_ct in (select so || '-BS' from _bs))) then
  raise exception 'Còn phiếu chưa ghi sổ — cuộn lại';
end if;
select string_agg(buoc || '=' || so, ', ' order by buoc) into v from _kq;
{"raise notice 'XONG: %', v;" if GHI else "raise exception 'CHAY_THU (cuon lai): %', v;"}
end $nap$;
"""
path = os.path.join(OUT, "bo-sung-0910.sql")
open(path, "w", encoding="utf-8", newline="\n").write(sql)
print(f"ma moi {len(cat_rows)}, hoa don moi {len(heads)} ({len(lines)} dong), dong bo sung {len(bs_lines)}, ma chot ton {len(targets)}")
p = subprocess.run([NPX, "supabase", "db", "query", "--db-url", db_url(), "-f", path], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
print("\n".join(l for l in (p.stdout + p.stderr).splitlines() if "new version" not in l and "recommend" not in l)[-1500:])
