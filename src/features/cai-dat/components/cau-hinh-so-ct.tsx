"use client";

import { Alert, App, Button, Input, InputNumber, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PostgrestError } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { dienGiaiLoi } from "@/shared/lib/errors";

import {
  layCauHinhSoCt,
  luuCauHinhSoCt,
  NHAN_LOAI_CT,
  viDuSoKeTiep,
  type DongCauHinhSoCt,
  type LoaiCt,
} from "../api/so-chung-tu.api";

const TIEN_TO_HOP_LE = /^[A-Z0-9]{1,5}$/;

type BanNhap = { tien_to: string; so_chu_so: number };

export function CauHinhSoCt() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const danhSach = useQuery({ queryKey: ["cau-hinh-so-ct"], queryFn: layCauHinhSoCt });

  const [nhap, setNhap] = useState<Record<string, BanNhap>>({});
  const [loi, setLoi] = useState<Record<string, string>>({});

  const luu = useMutation({
    mutationFn: (v: { loai: LoaiCt; giaTri: BanNhap }) => luuCauHinhSoCt(v.loai, v.giaTri),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cau-hinh-so-ct"] }),
  });
  const [dangLuu, setDangLuu] = useState<LoaiCt | null>(null);

  function giaTri(d: DongCauHinhSoCt): BanNhap {
    return nhap[d.loai_ct] ?? { tien_to: d.tien_to, so_chu_so: d.so_chu_so };
  }

  function doi(d: DongCauHinhSoCt, thayDoi: Partial<BanNhap>) {
    setNhap((s) => ({ ...s, [d.loai_ct]: { ...giaTri(d), ...thayDoi } }));
    setLoi((s) => ({ ...s, [d.loai_ct]: "" }));
  }

  function daDoi(d: DongCauHinhSoCt): boolean {
    const v = giaTri(d);
    return v.tien_to !== d.tien_to || v.so_chu_so !== d.so_chu_so;
  }

  function kiemTra(d: DongCauHinhSoCt, tatCa: DongCauHinhSoCt[]): string | null {
    const v = giaTri(d);
    if (!TIEN_TO_HOP_LE.test(v.tien_to)) {
      return "Tiền tố 1–5 ký tự, chỉ chữ in hoa không dấu và số.";
    }
    const trung = tatCa.find((k) => k.loai_ct !== d.loai_ct && giaTri(k).tien_to === v.tien_to);
    if (trung) return `Tiền tố đã dùng cho ${NHAN_LOAI_CT[trung.loai_ct]}.`;

    const dai = String(d.so_hien_tai).length;
    if (v.so_chu_so < dai) {
      return `Đã phát tới số ${d.so_hien_tai} — cần ít nhất ${dai} chữ số.`;
    }
    return null;
  }

  async function luuDong(d: DongCauHinhSoCt, tatCa: DongCauHinhSoCt[]) {
    const loiNhap = kiemTra(d, tatCa);
    if (loiNhap) {
      setLoi((s) => ({ ...s, [d.loai_ct]: loiNhap }));
      return;
    }

    setDangLuu(d.loai_ct);
    try {
      await luu.mutateAsync({ loai: d.loai_ct, giaTri: giaTri(d) });
      setNhap((s) => {
        const conLai = { ...s };
        delete conLai[d.loai_ct];
        return conLai;
      });
      message.success(`Đã lưu quy tắc số ${NHAN_LOAI_CT[d.loai_ct]}`);
    } catch (e) {
      if (e instanceof PostgrestError && (e.code === "23505" || e.code === "23514")) {
        setLoi((s) => ({
          ...s,
          [d.loai_ct]:
            e.code === "23505" ? "Tiền tố đã dùng cho loại khác." : e.message,
        }));
        return;
      }
      const l = dienGiaiLoi(e);
      setLoi((s) => ({ ...s, [d.loai_ct]: `${l.tieuDe}. ${l.huongXuLy}` }));
    } finally {
      setDangLuu(null);
    }
  }

  function cot(tatCa: DongCauHinhSoCt[]): ColumnsType<DongCauHinhSoCt> {
    return [
      {
        title: "Loại chứng từ",
        dataIndex: "loai_ct",
        width: 160,
        render: (l: LoaiCt) => NHAN_LOAI_CT[l],
      },
      {
        title: "Tiền tố",
        key: "tien_to",
        width: 200,
        render: (_, d) => (
          <div>
            <Input
              value={giaTri(d).tien_to}
              maxLength={5}
              status={loi[d.loai_ct] ? "error" : undefined}
              onChange={(e) => doi(d, { tien_to: e.target.value.toUpperCase() })}
            />
            {loi[d.loai_ct] ? (
              <div className="mt-1 text-xs text-red-600">{loi[d.loai_ct]}</div>
            ) : null}
          </div>
        ),
      },
      {
        title: "Số chữ số",
        key: "so_chu_so",
        width: 120,
        render: (_, d) => (
          <InputNumber
            min={3}
            max={8}
            value={giaTri(d).so_chu_so}
            onChange={(v) => doi(d, { so_chu_so: v ?? giaTri(d).so_chu_so })}
          />
        ),
      },
      { title: "Đã phát năm nay", dataIndex: "so_hien_tai", width: 130 },
      {
        title: "Số kế tiếp",
        key: "vi_du",
        width: 170,
        render: (_, d) => (
          <code>{viDuSoKeTiep(giaTri(d).tien_to, giaTri(d).so_chu_so, d.so_hien_tai)}</code>
        ),
      },
      {
        title: "",
        key: "luu",
        width: 90,
        align: "right",
        render: (_, d) => (
          <Button
            type="link"
            size="small"
            className="px-0"
            disabled={!daDoi(d)}
            loading={dangLuu === d.loai_ct}
            onClick={() => void luuDong(d, tatCa)}
          >
            Lưu
          </Button>
        ),
      },
    ];
  }

  return (
    <>
      <Alert
        className="mb-3"
        type="info"
        showIcon
        message="Đổi tiền tố chỉ áp cho chứng từ tạo sau. Số đã phát giữ nguyên. Số thứ tự tự đặt lại về 1 vào đầu năm."
      />

      <QueryState query={danhSach} moTaRong="Chưa có cấu hình đánh số nào.">
        {(d) => (
          <div className="overflow-x-auto">
            <Table<DongCauHinhSoCt>
              rowKey="loai_ct"
              size="small"
              columns={cot(d)}
              dataSource={d}
              pagination={false}
              scroll={{ x: 900 }}
            />
          </div>
        )}
      </QueryState>
    </>
  );
}
