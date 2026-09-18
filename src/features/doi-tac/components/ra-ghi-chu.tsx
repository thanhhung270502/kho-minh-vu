"use client";

import { Alert, Button, Input, Popconfirm, Progress, Result, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { QueryState } from "@/shared/components/query-state";

import {
  BO_LOC_GHI_CHU_MAC_DINH,
  type BoLocGhiChu,
  type DongGhiChu,
} from "../api/ra-ghi-chu.api";
import { useBoQuyetGhiChu, useDemGhiChu, useGhiChu } from "../hooks/useRaGhiChu";
import { HanhDongGhiChu } from "./hanh-dong-ghi-chu";

const KHOA_DA_DONG_MEO = "kho-minh-vu:meo-ra-ghi-chu";

/**
 * Mẹo đầu màn nhớ trạng thái "đã đóng" trong localStorage.
 *
 * Đọc bằng `useSyncExternalStore` chứ không `useEffect` + `setState`: localStorage
 * không có ở lượt render trên server, và đây đúng là "nguồn dữ liệu ngoài React".
 * Ảnh chụp phía server trả `true` (coi như đã đóng) nên HTML server không hiện
 * mẹo — không lệch hydrate, React tự vẽ lại sau khi hydrate xong.
 */
let dangNghe: Array<() => void> = [];

function dangKyMeo(cb: () => void) {
  dangNghe.push(cb);
  return () => {
    dangNghe = dangNghe.filter((x) => x !== cb);
  };
}

function docMeoDaDong(): boolean {
  try {
    return localStorage.getItem(KHOA_DA_DONG_MEO) === "1";
  } catch {
    // Chế độ riêng tư hoặc bị chặn site data — cứ hiện mẹo.
    return false;
  }
}

function dongMeo() {
  try {
    localStorage.setItem(KHOA_DA_DONG_MEO, "1");
  } catch {
    /* không ghi được thì lần sau hiện lại, chấp nhận */
  }
  dangNghe.forEach((cb) => cb());
}

const NHAN_QUYET: Record<string, string> = {
  KHACH: "Khách",
  SALE: "Sale",
  KHACH_VA_SALE: "Khách + sale",
  BO_QUA: "Bỏ qua",
};

function ngayNgan(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function RaGhiChu() {
  const dem = useDemGhiChu();
  const boQuyet = useBoQuyetGhiChu();
  const [boLoc, setBoLoc] = useState<BoLocGhiChu>(BO_LOC_GHI_CHU_MAC_DINH);
  const danhSach = useGhiChu(boLoc);

  const daDongMeo = useSyncExternalStore(dangKyMeo, docMeoDaDong, () => true);

  const dong = danhSach.data?.dong ?? [];
  const tong = danhSach.data?.tong ?? 0;

  // Quyết nốt phần tử cuối của trang 3 thì trang 3 biến mất — về trang 1 ngay
  // trong lúc render, không qua effect (xem SUMMARY plan 13).
  if (!danhSach.isPending && !danhSach.isFetching && boLoc.trang > 1 && dong.length === 0) {
    setBoLoc({ ...boLoc, trang: 1 });
  }

  const daRa = boLoc.trangThai === "da_ra";
  const soDaRa = (dem.data?.tong ?? 0) - (dem.data?.chuaRa ?? 0);
  const phanTram = dem.data?.tong ? Math.round((soDaRa / dem.data.tong) * 100) : 0;

  const cot: ColumnsType<DongGhiChu> = [
    {
      title: "Giá trị ghi chú",
      dataIndex: "gia_tri",
      render: (v: string) => (
        <Typography.Paragraph
          className="mb-0 whitespace-pre-line"
          ellipsis={{ rows: 3, expandable: true, symbol: "xem thêm" }}
        >
          {v}
        </Typography.Paragraph>
      ),
    },
    {
      title: "Hóa đơn",
      dataIndex: "so_hoa_don",
      width: 90,
      align: "right",
      render: (n: number) => <strong>{Number(n).toLocaleString("vi-VN")}</strong>,
    },
    {
      title: "Khoảng ngày",
      key: "ngay",
      width: 130,
      render: (_, d) => `${ngayNgan(d.ngay_dau)} → ${ngayNgan(d.ngay_cuoi)}`,
    },
    {
      title: "Hóa đơn mẫu",
      dataIndex: "hoa_don_mau",
      width: 200,
      render: (ds: string[] | null) => (
        <span className="flex flex-wrap gap-1">
          {(ds ?? []).slice(0, 3).map((h) => (
            <Tag key={h} className="m-0">
              {h}
            </Tag>
          ))}
        </span>
      ),
    },
    ...(daRa
      ? [
          {
            title: "Quyết định",
            key: "quyet",
            width: 220,
            render: (_: unknown, d: DongGhiChu) => (
              <span className="flex flex-wrap items-center gap-1">
                <Tag color={d.loai === "BO_QUA" ? undefined : "blue"}>
                  {NHAN_QUYET[d.loai] ?? d.loai}
                </Tag>
                {d.doi_tac_id ? (
                  <Link href={`/doi-tac/${d.doi_tac_id}`}>{d.ten_doi_tac}</Link>
                ) : null}
                {d.ten_sale ? <span className="text-gray-500">Sale: {d.ten_sale}</span> : null}
              </span>
            ),
          },
          {
            title: "",
            key: "huy",
            width: 130,
            align: "right" as const,
            render: (_: unknown, d: DongGhiChu) => (
              <Popconfirm
                title="Hủy quyết định này?"
                description="Giá trị quay lại danh sách chưa rà. Khách đã tạo KHÔNG bị xóa."
                okText="Hủy quyết định"
                cancelText="Thôi"
                onConfirm={() => void boQuyet.mutateAsync(d.gia_tri)}
              >
                <Button type="link" size="small" className="px-0" danger>
                  Hủy quyết định
                </Button>
              </Popconfirm>
            ),
          },
        ]
      : [
          {
            title: "",
            key: "hanh_dong",
            width: 340,
            align: "right" as const,
            render: (_: unknown, d: DongGhiChu) => <HanhDongGhiChu key={d.gia_tri} dong={d} />,
          },
        ]),
  ];

  if (dem.data && dem.data.chuaRa === 0 && !daRa) {
    return (
      <Result
        status="success"
        title="Đã rà xong mọi giá trị ghi chú"
        subTitle={`${dem.data.tong} giá trị đã có quyết định.`}
        extra={[
          <Link key="kh" href="/doi-tac?loai=KHACH">
            <Button type="primary">Xem danh sách khách hàng</Button>
          </Link>,
          <Button key="xem" onClick={() => setBoLoc({ ...BO_LOC_GHI_CHU_MAC_DINH, trangThai: "da_ra" })}>
            Xem lại các quyết định
          </Button>,
        ]}
      />
    );
  }

  return (
    <>
      <div className="mb-3">
        <Progress
          percent={phanTram}
          status={phanTram === 100 ? "success" : "active"}
          format={() => `${soDaRa}/${dem.data?.tong ?? 0}`}
        />
        <Typography.Text type="secondary">
          Còn <strong>{dem.data?.chuaRa ?? 0}</strong> giá trị chưa rà trên tổng{" "}
          {dem.data?.tong ?? 0}.
        </Typography.Text>
      </div>

      {daDongMeo ? null : (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          closable
          onClose={dongMeo}
          title="Hóa đơn không ghi tên đã tự gắn vào Khách lẻ. Tên ngắn như NGỌC, TỐT… có thể là khách hoặc người bán — hỏi người biết chuyện nếu chưa chắc, cứ để lại chưa rà."
        />
      )}

      <Tabs
        activeKey={boLoc.trangThai}
        onChange={(k) =>
          setBoLoc({ ...BO_LOC_GHI_CHU_MAC_DINH, trangThai: k as BoLocGhiChu["trangThai"] })
        }
        items={[
          { key: "chua_ra", label: `Chưa rà (${dem.data?.chuaRa ?? 0})` },
          { key: "da_ra", label: `Đã rà (${soDaRa})` },
        ]}
      />

      <Input.Search
        allowClear
        className="mb-3 w-full sm:max-w-md"
        placeholder="Tìm trong giá trị ghi chú"
        defaultValue={boLoc.q}
        onSearch={(v) => setBoLoc((b) => ({ ...b, q: v.trim(), trang: 1 }))}
      />

      <QueryState
        query={danhSach}
        laRong={(d) => d.dong.length === 0}
        moTaRong={
          boLoc.q
            ? `Không có giá trị nào khớp “${boLoc.q}”.`
            : daRa
              ? "Chưa quyết giá trị nào."
              : "Không còn giá trị nào chưa rà."
        }
      >
        {(d) => (
          <div className="overflow-x-auto">
            <Table<DongGhiChu>
              rowKey="gia_tri"
              size="small"
              columns={cot}
              dataSource={d.dong}
              loading={danhSach.isFetching && !danhSach.isPending}
              scroll={{ x: 1000 }}
              pagination={{
                current: boLoc.trang,
                pageSize: 30,
                total: tong,
                showSizeChanger: false,
                showTotal: (t) => `${t} giá trị`,
                onChange: (trang) => setBoLoc((b) => ({ ...b, trang })),
              }}
            />
          </div>
        )}
      </QueryState>
    </>
  );
}
