"""
Nạp lịch sử hóa đơn từ "DanhSachChiTietHoaDon_Da_process.xlsx" (mẫu Duyệt đơn 08/10/2026)
bằng SQL chạy thẳng trên database — nhanh hơn nhiều so với gọi REST từng phiếu.

  python scripts/nap_hoa_don_sql.py <file.xlsx> <thư-mục-ra>
  npx supabase db query --db-url "<chuỗi kết nối>" -f <thư-mục-ra>/a-chuan-bi.sql
  npx supabase db query --db-url "<chuỗi kết nối>" -f <thư-mục-ra>/b-ghi-so.sql    # lặp tới khi "con_lai = 0"
  npx supabase db query --db-url "<chuỗi kết nối>" -f <thư-mục-ra>/c-hoan-tat.sql

Vì sao ba bước: `supabase db query` nhận MỘT lệnh mỗi lần và pooler cắt lệnh quá ~2 phút,
nên dữ liệu trung gian nằm ở schema `nap_tam` (không lộ qua API), mỗi bước một khối DO
(= một transaction). Bước B chạy lại an toàn: chỉ ghi sổ hóa đơn còn nháp, theo ngày.

Tồn cuối KHÔNG đổi: bước A ghi phiếu Điều chỉnh ngày 14/06 cộng bù đúng lượng xuất của
các hóa đơn sắp nạp (theo mã, kho mặc định); bước C cộng sổ cái (kho_movement) của riêng
phiếu điều chỉnh + các hóa đơn vừa nạp theo từng (mã, kho) — phải ra 0. Không so ảnh chụp
ton_kho: app vẫn có người ghi sổ trong lúc nạp thì ảnh chụp lệch dù lần nạp đúng.

Quy tắc (giống các lần nạp trước và scripts/import-lich-su-moi.ts): hóa đơn đã có (theo
số) bỏ qua; dòng mã "{DEL}", mã không có trong danh mục hoặc số lượng không phải số dương
bỏ dòng; Mã khách hàng trống = NB001; Người duyệt đơn ghi
thành đoạn "Người bán: X" của ghi chú; hóa đơn "Đã hủy" ghi sổ rồi hủy (bút toán đảo);
đơn đặt dựng từ Mã đặt hàng (gộp mọi hóa đơn; mọi hóa đơn hủy → Đã hủy, còn lại Hoàn
thành; một dòng mỗi mã lấy từ hóa đơn chưa hủy), nối hóa đơn.
"""
import math
import os
import sys
from datetime import date, datetime

import openpyxl

OPENING_DATE = "2026-06-14"
OPENING_NOTE = "Bù tồn đầu kỳ cho lịch sử hóa đơn 15/06–08/10 nạp bổ sung — tồn cuối giữ nguyên"
CANCEL_REASON = "Hóa đơn đã hủy trên KiotViet"
IMPORT_USER = "quanly"
POST_BATCH = 300


def q(v):
    """Giá trị Python → literal SQL."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    s = str(v).strip()
    if s == "":
        return "null"
    return "'" + s.replace("'", "''") + "'"


def as_date(v):
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    d, m, y = str(v).strip()[:10].split("/")
    return f"{y}-{m}-{d}"


AS_MANAGER = f"""perform set_config('request.jwt.claims', json_build_object(
  'sub', (select id from public.nguoi_dung where ten_dang_nhap = {q(IMPORT_USER)}),
  'role', 'authenticated', 'vai_tro', 'quan_ly')::text, true);"""


def qty(v):
    """Số lượng nạp được: số thật, dương — như laSoLuongHopLe bên TS. Không được → None."""
    if isinstance(v, bool) or v is None:
        return None
    try:
        n = float(str(v).replace(",", ".")) if isinstance(v, str) else float(v)
    except ValueError:
        return None
    if not math.isfinite(n) or n <= 0:
        return None
    return int(n) if n.is_integer() else n


def read(src):
    ws = openpyxl.load_workbook(src, read_only=True, data_only=True).worksheets[0]
    rows = ws.iter_rows(values_only=True)
    col = {str(h).strip(): i for i, h in enumerate(next(rows))}
    need = ["Mã đặt hàng", "Mã hóa đơn", "Ngày", "Mã khách hàng", "Người duyệt đơn", "Người tạo",
            "Ghi chú", "Trạng thái", "Mã hàng", "Ghi chú dòng", "Số lượng"]
    if any(h not in col for h in need):
        raise SystemExit(f"Thiếu cột: {[h for h in need if h not in col]}")
    docs, lines, skipped = {}, [], []
    for r in rows:
        so = r[col["Mã hóa đơn"]]
        if not so:
            continue
        so = str(so).strip()
        n = qty(r[col["Số lượng"]])
        if n is None:
            skipped.append(f"{so} {r[col['Mã hàng']]} {r[col['Số lượng']]!r}")
            continue
        docs.setdefault(so, (
            so, as_date(r[col["Ngày"]]), r[col["Mã đặt hàng"]], r[col["Mã khách hàng"]],
            r[col["Người duyệt đơn"]], r[col["Người tạo"]], r[col["Ghi chú"]],
            "hủy" in str(r[col["Trạng thái"]] or "").lower(),
        ))
        lines.append((so, len(lines) + 1, r[col["Mã hàng"]], n, r[col["Ghi chú dòng"]]))
    return list(docs.values()), lines, skipped


def values(rs):
    return ",\n".join("(" + ", ".join(q(v) for v in row) + ")" for row in rs)


def step_a(docs, lines, trial):
    out = [f"""-- Bước A: chuẩn bị. {len(docs)} hóa đơn, {len(lines)} dòng trong file.
do $nap$
declare v text;
begin
{AS_MANAGER}
if exists (select 1 from pg_namespace where nspname = 'nap_tam') then
  raise exception 'Schema nap_tam đã có — bước A đã chạy. Chạy tiếp bước B / C (hoặc xóa nap_tam nếu muốn làm lại).';
end if;
create schema nap_tam;
create table nap_tam.hd (so text primary key, ngay date, ma_dh text, ma_kh text, duyet text, tao text, ghi_chu text, huy boolean);
create table nap_tam.dong (so text, thu_tu int, ma_hang text, so_luong numeric, ghi_chu text);
create table nap_tam.ket_qua (buoc text, so_luong bigint);
create table nap_tam.dieu_chinh (id uuid primary key);
"""]
    for i in range(0, len(docs), 2000):
        out.append(f"insert into nap_tam.hd values\n{values(docs[i:i + 2000])};\n")
    for i in range(0, len(lines), 5000):
        out.append(f"insert into nap_tam.dong values\n{values(lines[i:i + 5000])};\n")
    out.append(f"""
insert into nap_tam.ket_qua select 'hoa_don_trong_file', count(*) from nap_tam.hd;

-- Hóa đơn đã có trên hệ thống: bỏ qua.
delete from nap_tam.hd h using public.chung_tu ct where ct.so_ct = h.so;
delete from nap_tam.dong d where not exists (select 1 from nap_tam.hd h where h.so = d.so);
insert into nap_tam.ket_qua select 'hoa_don_se_nap', count(*) from nap_tam.hd;

-- Dòng mã đã xóa trên KiotViet ({{DEL}}) hoặc chưa có trong danh mục: bỏ dòng.
insert into nap_tam.ket_qua select 'dong_bo_qua_ma_khong_co', count(*) from nap_tam.dong d
  where not exists (select 1 from public.san_pham sp where upper(sp.ma_hang) = upper(d.ma_hang));
delete from nap_tam.dong d where not exists (select 1 from public.san_pham sp where upper(sp.ma_hang) = upper(d.ma_hang));
delete from nap_tam.hd h where not exists (select 1 from nap_tam.dong d where d.so = h.so);

select string_agg(distinct x, ', ') into v
from (select tao x from nap_tam.hd union select duyet from nap_tam.hd) s
where x is not null and not exists (select 1 from public.nguoi_dung nd where lower(trim(nd.ho_ten)) = lower(trim(s.x)));
if v is not null then raise exception 'Chưa có tài khoản cho: % — tạo ở Cài đặt → Người dùng rồi chạy lại', v; end if;
select string_agg(distinct ma_kh, ', ') into v from nap_tam.hd
where ma_kh is not null and not exists (select 1 from public.doi_tac dt where upper(dt.ma) = upper(nap_tam.hd.ma_kh));
if v is not null then raise exception 'Chưa có đối tác: %', v; end if;
-- uq_chung_tu_hoa_don_cua_don (0078): một đơn tối đa một hóa đơn chưa hủy — chặn ngay ở đây
-- thay vì để bước C chết lúc nối hóa đơn.
select string_agg(ma_dh || ' (' || n || ' hóa đơn)', ', ') into v from (
  select ma_dh, count(*) n from nap_tam.hd where ma_dh is not null and not huy group by ma_dh having count(*) > 1
  union all
  select h.ma_dh, 1 from nap_tam.hd h join public.don_dat_hang dh on dh.so_dh = h.ma_dh
  join public.chung_tu ct on ct.don_dat_hang_id = dh.id and ct.loai_ct = 'XUAT' and ct.trang_thai <> 'DA_HUY'
  where not h.huy) s;
if v is not null then raise exception 'Đơn đặt có nhiều hơn một hóa đơn chưa hủy: %', v; end if;

-- Hóa đơn nháp + dòng: kho dòng = kho mặc định của mã.
insert into public.chung_tu (so_ct, loai_ct, kho_id, ngay_ct, doi_tac_id, ghi_chu, nguoi_tao_id)
select h.so, 'XUAT', (select id from public.kho where ma = 'K1'), h.ngay,
       (select dt.id from public.doi_tac dt where upper(dt.ma) = upper(coalesce(h.ma_kh, 'NB001'))),
       nullif(concat_ws(' · ', nullif(trim(h.ghi_chu), ''), 'Người bán: ' || nullif(trim(h.duyet), '')), ''),
       (select nd.id from public.nguoi_dung nd where lower(trim(nd.ho_ten)) = lower(trim(h.tao)))
from nap_tam.hd h;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, ghi_chu, created_at)
select ct.id, sp.id, d.so_luong, 0, 0, coalesce(sp.kho_mac_dinh_id, ct.kho_id), nullif(trim(d.ghi_chu), ''),
       now() + make_interval(secs => d.thu_tu / 1000000.0)
from nap_tam.dong d
join public.chung_tu ct on ct.so_ct = d.so and ct.loai_ct = 'XUAT'
join public.san_pham sp on upper(sp.ma_hang) = upper(d.ma_hang);
insert into nap_tam.ket_qua select 'dong_hoa_don', count(*) from nap_tam.dong;

-- Điều chỉnh bù 14/06: + lượng xuất của các hóa đơn sắp nạp (hóa đơn hủy ròng = 0).
declare v_ct uuid;
begin
  insert into public.chung_tu (so_ct, loai_ct, kho_id, ngay_ct, ghi_chu)
  values (public.sinh_so_ct('DIEU_CHINH'), 'DIEU_CHINH', (select id from public.kho where ma = 'K1'), date {q(OPENING_DATE)}, {q(OPENING_NOTE)})
  returning id into v_ct;
  insert into nap_tam.dieu_chinh values (v_ct);
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
  select v_ct, d.san_pham_id, sum(d.so_luong), 0, 0, d.kho_id
  from public.chung_tu_dong d
  join public.chung_tu ct on ct.id = d.chung_tu_id
  join nap_tam.hd h on h.so = ct.so_ct and ct.loai_ct = 'XUAT' and not h.huy
  group by d.san_pham_id, d.kho_id;
  perform public.ghi_so_chung_tu(v_ct);
  insert into nap_tam.ket_qua select 'dieu_chinh_bu_so_dong', count(*) from public.chung_tu_dong where chung_tu_id = v_ct;
end;

select string_agg(buoc || '=' || so_luong, ', ' order by buoc) into v from nap_tam.ket_qua;
{"raise exception 'CHAY_THU A (da cuon lai, khong ghi gi): %', v;" if trial else "raise notice 'A xong: %', v;"}
end $nap$;
""")
    return "".join(out)


STEP_B = f"""-- Bước B: ghi sổ {POST_BATCH} hóa đơn nháp kế tiếp (theo ngày). Lặp tới khi con_lai = 0.
do $nap$
declare r record; n int := 0; am int := 0;
begin
{AS_MANAGER}
for r in
  select ct.id from public.chung_tu ct
  join nap_tam.hd h on h.so = ct.so_ct and ct.loai_ct = 'XUAT'
  where ct.trang_thai = 'NHAP_LIEU'
  order by h.ngay, h.so
  limit {POST_BATCH}
loop
  begin
    perform public.ghi_so_chung_tu(r.id);
  exception when others then
    -- Thứ tự trong ngày của KiotViet không có: xuất trước nhập cùng ngày thì âm tạm.
    if sqlerrm ilike '%xuất âm%' or sqlerrm ilike '%quá tồn%' then
      update public.chung_tu set ly_do_xuat_am = 'LECH_TON_CHO_KIEM_KE' where id = r.id;
      perform public.ghi_so_chung_tu(r.id);
      am := am + 1;
    else
      raise;
    end if;
  end;
  n := n + 1;
end loop;
insert into nap_tam.ket_qua values ('ghi_so_lo', n), ('xuat_am_tam', am);
end $nap$;
"""

STEP_B_COUNT = """select count(*) as con_lai from public.chung_tu ct join nap_tam.hd h on h.so = ct.so_ct and ct.loai_ct = 'XUAT' where ct.trang_thai = 'NHAP_LIEU';
"""

STEP_C = f"""-- Bước C: hủy hóa đơn hủy, đơn đặt, bộ đếm, so tồn, dọn nap_tam.
do $nap$
declare r record; n int := 0; v text; vi int; vd text;
begin
{AS_MANAGER}
if exists (select 1 from public.chung_tu ct join nap_tam.hd h on h.so = ct.so_ct and ct.loai_ct = 'XUAT' where ct.trang_thai = 'NHAP_LIEU') then
  raise exception 'Còn hóa đơn chưa ghi sổ — chạy bước B tới khi con_lai = 0 trước.';
end if;

for r in select ct.id from public.chung_tu ct join nap_tam.hd h on h.so = ct.so_ct and ct.loai_ct = 'XUAT'
         where h.huy and ct.trang_thai <> 'DA_HUY' loop
  perform public.huy_chung_tu(r.id, {q(CANCEL_REASON)});
  n := n + 1;
end loop;
insert into nap_tam.ket_qua values ('hoa_don_da_huy', n);

-- Đơn đặt: một đơn mỗi Mã đặt hàng (gộp mọi hóa đơn của nó), Hoàn thành / Đã hủy, nối hóa đơn.
-- Dòng đơn: một dòng mỗi mã (so_luong_da_xuat của hệ tính theo mã — _cap_nhat_tien_do_ddh,
-- 0050), lấy từ hóa đơn chưa hủy (đơn hủy hết: từ mọi hóa đơn, đã xuất = 0).
create temp table _don on commit drop as
select h.ma_dh, min(h.ngay) as ngay, bool_and(h.huy) as huy,
       (array_agg(h.ma_kh order by h.ngay, h.so))[1] as ma_kh,
       (array_agg(h.ghi_chu order by h.ngay, h.so))[1] as ghi_chu,
       (array_agg(h.tao order by h.ngay, h.so))[1] as tao,
       (array_agg(h.duyet order by h.ngay, h.so))[1] as duyet
from nap_tam.hd h
where h.ma_dh is not null and not exists (select 1 from public.don_dat_hang dh where dh.so_dh = h.ma_dh)
group by h.ma_dh;

insert into public.don_dat_hang (so_dh, ngay_dh, trang_thai, doi_tac_id, ghi_chu, nguoi_tao_id, nguoi_xac_nhan_id, ngay_xac_nhan)
select o.ma_dh, o.ngay, case when o.huy then 'DA_HUY' else 'HOAN_THANH' end::public.trang_thai_ddh,
       (select dt.id from public.doi_tac dt where upper(dt.ma) = upper(coalesce(o.ma_kh, 'NB001'))),
       nullif(trim(o.ghi_chu), ''),
       (select nd.id from public.nguoi_dung nd where lower(trim(nd.ho_ten)) = lower(trim(o.tao))),
       (select nd.id from public.nguoi_dung nd where lower(trim(nd.ho_ten)) = lower(trim(o.duyet))),
       (o.ngay::timestamp at time zone 'Asia/Ho_Chi_Minh')
from _don o;
insert into nap_tam.ket_qua select 'don_dat_moi', count(*) from _don;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, so_luong_da_xuat, don_gia, ghi_chu, created_at)
select dh.id, d.san_pham_id, sum(d.so_luong), case when o.huy then 0 else sum(d.so_luong) end, 0,
       (array_agg(d.ghi_chu order by d.created_at) filter (where d.ghi_chu is not null))[1], min(d.created_at)
from _don o
join public.don_dat_hang dh on dh.so_dh = o.ma_dh
join nap_tam.hd h on h.ma_dh = o.ma_dh and (o.huy or not h.huy)
join public.chung_tu ct on ct.so_ct = h.so and ct.loai_ct = 'XUAT'
join public.chung_tu_dong d on d.chung_tu_id = ct.id
group by dh.id, d.san_pham_id, o.huy;

update public.chung_tu ct set don_dat_hang_id = dh.id
from nap_tam.hd h join public.don_dat_hang dh on dh.so_dh = h.ma_dh
where ct.so_ct = h.so and ct.loai_ct = 'XUAT' and ct.don_dat_hang_id is null;

-- Bộ đếm số: phiếu mới trên app đi tiếp sau số lớn nhất. Upsert, không update: dòng đếm
-- chỉ sinh ở lần cấp số đầu, project chưa từng tạo hóa đơn / đơn trên app thì chưa có.
insert into public.chuoi_so_ct (loai_ct, nam, nguon, so_hien_tai)
select 'XUAT', 0, '', coalesce(max(substring(so_ct from '^HD(\\d+)$')::int), 0)
from public.chung_tu where loai_ct = 'XUAT'
on conflict (loai_ct, nam, nguon) do update
  set so_hien_tai = greatest(public.chuoi_so_ct.so_hien_tai, excluded.so_hien_tai);
insert into public.chuoi_so_dh (nam, so_hien_tai)
select 0, coalesce(max(substring(so_dh from '^DH(\\d+)$')::int), 0) from public.don_dat_hang
on conflict (nam) do update
  set so_hien_tai = greatest(public.chuoi_so_dh.so_hien_tai, excluded.so_hien_tai);

-- Lần nạp không đổi tồn: sổ cái của điều chỉnh bù + hóa đơn vừa nạp (gồm bút toán đảo
-- của hóa đơn hủy — cùng chung_tu_id) cộng lại = 0 ở từng (mã, kho).
select count(*), string_agg(x, '; ') into vi, vd from (
  select sp.ma_hang || ' ' || k.ma || ' ' || sum(m.so_luong) as x
  from public.kho_movement m
  join public.san_pham sp on sp.id = m.san_pham_id
  join public.kho k on k.id = m.kho_id
  where m.chung_tu_id in (
    select id from nap_tam.dieu_chinh
    union all
    select ct.id from public.chung_tu ct join nap_tam.hd h on h.so = ct.so_ct and ct.loai_ct = 'XUAT')
  group by sp.ma_hang, k.ma
  having sum(m.so_luong) <> 0
  limit 20) s;
if vi > 0 then raise exception 'Tồn lệch (% dòng), vd: % — bước C cuộn lại; nap_tam giữ nguyên để đối chiếu', vi, vd; end if;
insert into nap_tam.ket_qua values ('ton_lech', 0);

select string_agg(buoc || '=' || so_luong, ', ' order by buoc) into v from nap_tam.ket_qua;
drop schema nap_tam cascade;
raise notice 'Xong: %', v;
end $nap$;
"""


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    trial = "--thu" in sys.argv
    docs, lines, skipped = read(src)
    os.makedirs(out_dir, exist_ok=True)
    files = {
        "a-chuan-bi.sql": step_a(docs, lines, trial),
        "b-ghi-so.sql": STEP_B,
        "b-dem.sql": STEP_B_COUNT,
        "c-hoan-tat.sql": STEP_C,
    }
    for name, body in files.items():
        with open(os.path.join(out_dir, name), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(body)
    print(f"Đã ghi {out_dir}: {len(docs)} hóa đơn, {len(lines)} dòng{' (bước A chạy thử)' if trial else ''}")
    if skipped:
        print(f"Bỏ {len(skipped)} dòng số lượng không hợp lệ, vd: {'; '.join(skipped[:10])}")


if __name__ == "__main__":
    main()
