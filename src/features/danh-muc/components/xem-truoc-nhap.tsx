"use client";

import { Alert, Button, Statistic, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import type { LoiDong, PhanHoiNhap, ThayDoiDong } from "../api/nhap-excel.api";
import { taoCsvLoi, tenFileLoi } from "../lib/file-loi";
import { nhanCot } from "../lib/mau-excel";

function hienGiaTri(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(trống)";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  return String(v);
}

function taiCsv(loi: LoiDong[], tenFile: string) {
  const diaChi = URL.createObjectURL(taoCsvLoi(loi));
  const a = document.createElement("a");
  a.href = diaChi;
  a.download = tenFileLoi(tenFile);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(diaChi);
}

const COT_LOI: ColumnsType<LoiDong> = [
  { title: "Dòng", dataIndex: "dong", width: 80 },
  { title: "Cột", dataIndex: "cot", width: 160, render: (c: string) => nhanCot(c) },
  { title: "Lý do", dataIndex: "thong_bao" },
];

export function XemTruocNhap({
  phanHoi,
  tenFile,
}: {
  phanHoi: PhanHoiNhap;
  tenFile: string;
}) {
  const { ketQua, dinhDang } = phanHoi;
  const sua = ketQua.thay_doi.filter((t) => t.loai === "SUA");
  const them = ketQua.thay_doi.filter((t) => t.loai === "THEM");

  const cotSua: ColumnsType<ThayDoiDong> = [
    { title: "Dòng", dataIndex: "dong", width: 80 },
    { title: "Mã hàng", dataIndex: "ma_hang", width: 170 },
    {
      title: "Thay đổi",
      key: "truong",
      render: (_, t) => (
        <ul className="mb-0 list-none ps-0 text-sm">
          {Object.entries(t.truong ?? {}).map(([truong, gt]) => (
            <li key={truong}>
              <span className="text-gray-500">{nhanCot(truong)}:</span>{" "}
              <span className="text-gray-400 line-through">{hienGiaTri(gt?.[0])}</span> →{" "}
              {hienGiaTri(gt?.[1])}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tag color={dinhDang === "mau_moi" ? "blue" : "orange"}>
          {dinhDang === "mau_moi" ? "Mẫu hệ mới" : "File KiotViet"}
        </Tag>
        <Typography.Text type="secondary">{tenFile}</Typography.Text>
      </div>

      {dinhDang === "kiotviet" ? (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="File KiotViet: công đoạn chỉ cập nhật cho mã suy được từ ô ĐVT (Carbon, Sơn, Xi mạ, Ép, Nano). Mã “CÁI/CẶP/BỘ” giữ nguyên công đoạn đã rà; mã mới nhận Mua ngoài."
        />
      ) : null}

      <div className="mb-3 flex flex-wrap gap-8">
        <Statistic title="Thêm mới" value={ketQua.them} valueStyle={{ color: "#389e0d" }} />
        <Statistic title="Sửa" value={ketQua.sua} valueStyle={{ color: "#1677ff" }} />
        <Statistic title="Không đổi" value={ketQua.khong_doi} />
        <Statistic
          title="Lỗi"
          value={ketQua.loi.length}
          valueStyle={ketQua.loi.length ? { color: "#cf1322" } : undefined}
        />
      </div>

      {ketQua.thay_doi_bi_cat ? (
        <Typography.Text type="secondary" className="mb-2 block">
          Chỉ hiện 500 thay đổi đầu — toàn bộ vẫn được nạp.
        </Typography.Text>
      ) : null}

      <div className="max-h-[60vh] overflow-auto">
        <Tabs
          defaultActiveKey={ketQua.loi.length > 0 ? "loi" : "sua"}
          items={[
            {
              key: "loi",
              label: `Lỗi (${ketQua.loi.length})`,
              children: (
                <>
                  {ketQua.loi.length > 0 ? (
                    <Button
                      className="mb-2"
                      size="small"
                      onClick={() => taiCsv(ketQua.loi, tenFile)}
                    >
                      Tải danh sách lỗi (.csv)
                    </Button>
                  ) : null}
                  <Table<LoiDong>
                    rowKey={(r) => `${r.dong}-${r.cot}`}
                    size="small"
                    columns={COT_LOI}
                    dataSource={ketQua.loi}
                    pagination={false}
                    locale={{ emptyText: "Không có lỗi nào." }}
                  />
                </>
              ),
            },
            {
              key: "sua",
              label: `Sửa (${ketQua.sua})`,
              children: (
                <Table<ThayDoiDong>
                  rowKey="dong"
                  size="small"
                  columns={cotSua}
                  dataSource={sua}
                  pagination={false}
                  locale={{ emptyText: "Không có mã nào thay đổi." }}
                />
              ),
            },
            {
              key: "them",
              label: `Thêm (${ketQua.them})`,
              children: (
                <Table<ThayDoiDong>
                  rowKey="dong"
                  size="small"
                  columns={[
                    { title: "Dòng", dataIndex: "dong", width: 80 },
                    { title: "Mã hàng", dataIndex: "ma_hang" },
                  ]}
                  dataSource={them}
                  pagination={false}
                  locale={{ emptyText: "Không có mã mới." }}
                />
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
