"use client";

import {
  DeleteOutlined,
  MoreOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Image, Spin } from "antd";

import { imageUrl } from "../lib/image-url";
import type { ProductImage } from "../types";

/**
 * Một ô ảnh vuông trong thư viện. Bấm ảnh để phóng to (component cha bọc
 * `Image.PreviewGroup`). Thao tác gom vào một nút "⋯" ở góc — không xếp nút chữ
 * dưới ảnh nên không bao giờ chồng lên ô bên cạnh.
 */
export function ImageTile({
  image,
  canEdit,
  pending,
  onSetPrimary,
  onDelete,
}: {
  image: ProductImage;
  canEdit: boolean;
  /** Ảnh này đang được đặt làm chính / đang xóa. */
  pending: boolean;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-shadow hover:shadow-md">
      <Image
        src={imageUrl(image.id, "thumb")}
        preview={{ src: imageUrl(image.id) }}
        alt="Ảnh mã hàng"
        width="100%"
        height="100%"
        rootClassName="block h-full w-full"
        className="h-full w-full object-cover"
        // Lần đầu xem, thumbnail đi qua Apps Script mất vài giây — nền nhấp nháy thay cho ô trắng.
        placeholder={
          <div className="h-full w-full animate-pulse bg-gray-100" />
        }
      />

      {image.isPrimary ? (
        // Góc dưới, tách khỏi nút "⋯" góc trên; ô nhỏ trên điện thoại chỉ hiện ngôi sao.
        <span
          title="Ảnh chính"
          className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-xs font-medium text-amber-600 shadow-sm backdrop-blur sm:px-2"
        >
          <StarFilled />
          <span className="hidden sm:inline">Ảnh chính</span>
        </span>
      ) : null}

      {canEdit ? (
        // Màn cảm ứng (điện thoại, iPad) không hover được — nút luôn hiện; có chuột thì
        // chỉ hiện khi rê vào ảnh. Dựa vào khả năng hover, không dựa vào độ rộng màn hình.
        <div className="absolute right-2 top-2 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                ...(image.isPrimary
                  ? []
                  : [
                      {
                        key: "primary",
                        icon: <StarOutlined />,
                        label: "Đặt làm ảnh chính",
                      },
                    ]),
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: "Xóa ảnh",
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === "primary") onSetPrimary(image.id);
                if (key === "delete") onDelete(image.id);
              },
            }}
          >
            <Button
              shape="circle"
              size="small"
              icon={<MoreOutlined />}
              aria-label="Thao tác với ảnh"
              className="border-none bg-white/90 shadow-sm backdrop-blur"
            />
          </Dropdown>
        </div>
      ) : null}

      {pending ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <Spin />
        </div>
      ) : null}
    </div>
  );
}
