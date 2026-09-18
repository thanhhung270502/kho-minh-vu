"use client";

import { Tag, Timeline, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { ReactNode } from "react";

import {
  khoaLichSuSua,
  layLichSuSua,
  type BangCoNhatKy,
  type DongLichSuSua,
} from "@/shared/api/lich-su-sua.api";
import { QueryState } from "@/shared/components/query-state";

const NHAN_NGUON: Record<string, string> = {
  form: "Sửa tay",
  sua_o: "Sửa trên bảng",
  hang_loat: "Sửa hàng loạt",
  goi_y_duoi: "Gợi ý công đoạn",
  import: "Nhập Excel",
  ra_ghi_chu: "Rà ghi chú",
  cai_dat: "Cài đặt",
  script: "Nạp dữ liệu",
};

type Props = {
  bang: BangCoNhatKy;
  id: string;
  nhanTruong: Record<string, string>;
  /** Đổi uuid nhóm hàng / ĐVT / công đoạn thành tên đọc được. */
  hienGiaTri?: (truong: string, v: unknown) => ReactNode;
};

function macDinhHien(v: unknown): ReactNode {
  if (v === null || v === undefined || v === "") return "(trống)";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  return String(v);
}

/** Một lần lưu sửa nhiều trường → gom thành một mục trên dòng thời gian. */
function gom(dong: DongLichSuSua[]) {
  const theoLan = new Map<string, DongLichSuSua[]>();

  for (const d of dong) {
    const khoa = `${d.sua_luc}|${d.nguoi_sua_id ?? ""}|${d.nguon}`;
    const cu = theoLan.get(khoa);
    if (cu) cu.push(d);
    else theoLan.set(khoa, [d]);
  }

  return [...theoLan.values()];
}

export function LichSuSua({ bang, id, nhanTruong, hienGiaTri }: Props) {
  const lichSu = useQuery({
    queryKey: khoaLichSuSua(bang, id),
    queryFn: () => layLichSuSua(bang, id),
  });

  const hien = (truong: string, v: unknown): ReactNode =>
    hienGiaTri?.(truong, v) ?? macDinhHien(v);

  return (
    <QueryState query={lichSu} moTaRong="Chưa có lần sửa nào kể từ khi bật nhật ký.">
      {(dong) => (
        <Timeline
          className="mt-2"
          items={gom(dong).map((lan) => {
            const dau = lan[0];

            return {
              key: dau.id,
              children: (
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{dau.ho_ten_nguoi_sua ?? "Hệ thống"}</strong>
                    <Typography.Text type="secondary">
                      {dayjs(dau.sua_luc).format("HH:mm DD/MM/YYYY")}
                    </Typography.Text>
                    <Tag>{NHAN_NGUON[dau.nguon] ?? dau.nguon}</Tag>
                  </div>

                  <ul className="mt-1 list-none ps-0 text-sm">
                    {lan.map((d) =>
                      d.truong === "_tao_moi" ? (
                        <li key={d.id}>Tạo mới</li>
                      ) : (
                        <li key={d.id}>
                          <span className="text-gray-500">
                            {nhanTruong[d.truong] ?? d.truong}:
                          </span>{" "}
                          <span className="text-gray-400 line-through">
                            {hien(d.truong, d.gia_tri_cu)}
                          </span>{" "}
                          → <span>{hien(d.truong, d.gia_tri_moi)}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ),
            };
          })}
        />
      )}
    </QueryState>
  );
}
