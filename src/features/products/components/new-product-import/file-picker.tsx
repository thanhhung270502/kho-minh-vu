"use client";

import { InboxOutlined } from "@ant-design/icons";
import { Alert, Spin, Upload } from "antd";

import { MAX_FILE_MB } from "../../lib/excel-template";

type Props = {
  reading: boolean;
  /** Danh mục (nhóm, ĐVT, xử lý, kho) chưa tải xong — chọn file lúc này sẽ báo "không khớp" sai cho mọi ô. */
  waitingLookups: boolean;
  error: { title: string; action: string } | null;
  onPick: (file: File) => void;
};

/** Bước 1: tải file mẫu (cùng bố cục file cập nhật mã hàng), chọn file đã điền (IMP-01). */
export function FilePicker({ reading, waitingLookups, error, onPick }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm">
        File cùng bố cục với file cập nhật mã hàng. Bắt buộc <b>Mã hàng</b>, <b>Tên hàng</b>; Nhóm hàng, Đơn vị
        tính, Xử lý, Vị trí… điền sẵn thì tự khớp, sửa lại được ở bước sau.{" "}
        <a href="/api/danh-muc/mau-nhap-moi" download>
          Tải file mẫu
        </a>
      </p>

      {error ? <Alert type="error" showIcon title={error.title} description={error.action} /> : null}

      <Spin spinning={reading || waitingLookups} description={reading ? "Đang đọc file…" : "Đang tải danh mục…"}>
        <Upload.Dragger
          accept=".xlsx"
          multiple={false}
          showUploadList={false}
          disabled={reading || waitingLookups}
          beforeUpload={(file) => {
            onPick(file);
            return false; // antd không tự upload — route handler đọc file.
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Bấm hoặc kéo file Excel (.xlsx) vào đây</p>
          <p className="ant-upload-hint">Tối đa {MAX_FILE_MB}MB, 10.000 dòng.</p>
        </Upload.Dragger>
      </Spin>
    </div>
  );
}
