"use client";

import { Alert, App, Form, Modal, Radio, Select } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import { useDanhSachDoiTac } from "@/features/doi-tac/hooks/useDoiTac";
import { BO_LOC_DOI_TAC_MAC_DINH } from "@/features/doi-tac/types";
import { explainError, errorCode } from "@/shared/lib/errors";

import { useTaoPhieu } from "../hooks/usePhieuNhap";
import { NHAN_NGUON_NHAP, type NguonNhap } from "../types";

/** Mã NCC của nhà máy Vũ Trụ L.An — chọn nó thì gợi ý nguồn "Nhà máy". */
const MA_NHA_MAY = "NCC000001";

export function NutTaoPhieu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const router = useRouter();
  const taoPhieu = useTaoPhieu();
  const lookups = useLookups();
  const ncc = useDanhSachDoiTac({ ...BO_LOC_DOI_TAC_MAC_DINH, loai: "NCC" });

  const [doiTacId, setDoiTacId] = useState<string | undefined>();
  const [khoId, setKhoId] = useState<string | undefined>();
  const [nguon, setNguon] = useState<NguonNhap>("NCC");
  const [loi, setLoi] = useState<string | null>(null);

  const kho = lookups.data?.kho ?? [];
  const khoChon = khoId ?? (kho.length === 1 ? kho[0]?.id : undefined);

  function dong() {
    if (taoPhieu.isPending) return;
    setLoi(null);
    onClose();
  }

  async function tao() {
    if (!doiTacId || !khoChon) {
      setLoi("Chọn nhà cung cấp và kho trước khi tạo phiếu.");
      return;
    }

    try {
      const id = await taoPhieu.mutateAsync({
        doi_tac_id: doiTacId,
        kho_id: khoChon,
        nguon_nhap: nguon,
      });
      message.success("Đã tạo phiếu, số phiếu đã được cấp");
      onClose();
      router.push(`/nhap-kho/${id}`);
    } catch (e) {
      if (errorCode(e) === "42501") {
        setLoi("Tài khoản không có quyền tạo phiếu nhập.");
        return;
      }
      const l = explainError(e);
      setLoi(`${l.title}. ${l.action}`);
    }
  }

  return (
    <Modal
      open={open}
      title="Tạo phiếu nhập"
      okText="Tạo phiếu"
      cancelText="Hủy"
      confirmLoading={taoPhieu.isPending}
      onOk={() => void tao()}
      onCancel={dong}
    >
      {loi ? <Alert className="mb-3" type="error" showIcon title={loi} /> : null}

      <Alert
        className="mb-3"
        type="info"
        showIcon
        title="Bấm Tạo là phiếu được cấp số ngay và lưu trên server — nhập dở vẫn còn khi mất điện hay đổi máy."
      />

      <Form layout="vertical">
        <Form.Item label="Nhà cung cấp">
          <Select
            showSearch
            autoFocus
            optionFilterProp="label"
            placeholder="Chọn nhà cung cấp"
            loading={ncc.isPending}
            value={doiTacId}
            options={(ncc.data?.dong ?? []).map((d) => ({
              value: d.id,
              label: `${d.ma} — ${d.ten}`,
            }))}
            onChange={(v) => {
              setDoiTacId(v);
              // Gợi ý thôi, không ép: nhà máy cũng có thể gửi hàng mua ngoài.
              const chon = (ncc.data?.dong ?? []).find((d) => d.id === v);
              if (chon?.ma === MA_NHA_MAY) setNguon("NHA_MAY");
            }}
          />
        </Form.Item>

        <Form.Item label="Kho mặc định" help="Từng dòng vẫn chọn kho riêng được.">
          <Select
            placeholder="Chọn kho"
            value={khoChon}
            options={kho.map((k) => ({ value: k.id, label: k.ten }))}
            onChange={setKhoId}
          />
        </Form.Item>

        <Form.Item
          label="Nguồn nhập"
          help="Quyết định dãy số phiếu — chọn xong không đổi được vì số đã cấp theo nguồn."
        >
          <Radio.Group
            value={nguon}
            optionType="button"
            buttonStyle="solid"
            onChange={(e) => setNguon(e.target.value as NguonNhap)}
          >
            {(["NCC", "NHA_MAY"] as const).map((n) => (
              <Radio.Button key={n} value={n}>
                {NHAN_NGUON_NHAP[n]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}
