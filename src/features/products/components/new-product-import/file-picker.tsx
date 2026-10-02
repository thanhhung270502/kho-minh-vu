"use client";

import { InboxOutlined } from "@ant-design/icons";
import { Alert, Spin, Upload } from "antd";

import { MAX_FILE_MB } from "../../lib/excel-template";

type Props = {
  reading: boolean;
  error: { title: string; action: string } | null;
  onPick: (file: File) => void;
};

/** Bước 1: tải file mẫu 4 cột, chọn file đã điền (IMP-01). */
export function FilePicker({ reading, error, onPick }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm">
        File chỉ cần 4 cột: <b>Mã hàng</b>, <b>Tên hàng</b>, <b>Tồn kho</b>, <b>Mô tả</b>. Các trường khác chọn ở
        bước sau.{" "}
        <a href="/api/danh-muc/mau-nhap-moi" download>
          Tải file mẫu
        </a>
      </p>

      {error ? <Alert type="error" showIcon title={error.title} description={error.action} /> : null}

      <Spin spinning={reading} description="Đang đọc file…">
        <Upload.Dragger
          accept=".xlsx"
          multiple={false}
          showUploadList={false}
          disabled={reading}
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
