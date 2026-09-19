"use client";

import { Button } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ListLayout } from "@/shared/components/list-layout";
import { QueryState } from "@/shared/components/query-state";

import { useDanhSachPhieu } from "../hooks/usePhieuNhap";
import {
  BO_LOC_PHIEU_MAC_DINH,
  demDieuKienPhieu,
  docBoLocPhieu,
  ghiBoLocPhieu,
  type BoLocPhieu,
} from "../schemas/phieu-nhap.schema";
import { NoiDungBangPhieu } from "./noi-dung-bang-phieu";
import { NutTaoPhieu } from "./nut-tao-phieu";
import { PanelLocPhieu } from "./panel-loc-phieu";
import { ThanhCongCuPhieu } from "./thanh-cong-cu-phieu";

export function BangPhieuNhap({ coQuyenTao }: { coQuyenTao: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo(() => docBoLocPhieu(searchParams), [searchParams]);
  const danhSach = useDanhSachPhieu(filter);
  const [taoMo, setTaoMo] = useState(false);

  const doiBoLoc = useCallback(
    (b: BoLocPhieu) => {
      const sp = ghiBoLocPhieu(b).toString();
      router.replace(sp ? `${pathname}?${sp}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const dong = danhSach.data?.dong ?? [];
  const tong = danhSach.data?.tong ?? 0;

  // Trang cuối cạn sau khi lọc lại — về page 1 thay vì hiện "không có gì".
  useEffect(() => {
    if (danhSach.isPending || danhSach.isFetching) return;
    if (filter.page > 1 && dong.length === 0) doiBoLoc({ ...filter, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [danhSach.isPending, danhSach.isFetching, dong.length, filter.page]);

  const coLoc = demDieuKienPhieu(filter) > 0;

  return (
    <>
      <ListLayout
        activeFilterCount={demDieuKienPhieu(filter)}
        filterPanel={<PanelLocPhieu filter={filter} onDoi={doiBoLoc} />}
        toolbar={
          <ThanhCongCuPhieu
            filter={filter}
            onDoi={doiBoLoc}
            nutThem={
              coQuyenTao ? (
                <Button type="primary" onClick={() => setTaoMo(true)}>
                  Tạo phiếu nhập
                </Button>
              ) : null
            }
          />
        }
      >
        <QueryState
          query={danhSach}
          isEmpty={(d) => d.dong.length === 0}
          emptyDescription={
            filter.q ? (
              `Không có phiếu nào khớp “${filter.q}”.`
            ) : coLoc ? (
              <div className="flex flex-col items-center gap-3">
                <span>Không có phiếu nào khớp bộ lọc.</span>
                <Button size="small" onClick={() => doiBoLoc(BO_LOC_PHIEU_MAC_DINH)}>
                  Xóa bộ lọc
                </Button>
              </div>
            ) : (
              "Chưa có phiếu nhập nào. Bấm “Tạo phiếu nhập” để ghi chuyến hàng đầu tiên."
            )
          }
        >
          {(d) => (
            <NoiDungBangPhieu
              dong={d.dong}
              tong={tong}
              filter={filter}
              dangTai={danhSach.isFetching && !danhSach.isPending}
              onDoiBoLoc={doiBoLoc}
            />
          )}
        </QueryState>
      </ListLayout>

      <NutTaoPhieu open={taoMo} onClose={() => setTaoMo(false)} />
    </>
  );
}
