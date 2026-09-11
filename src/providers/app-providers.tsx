"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import type { ReactNode } from "react";

import { antdTheme } from "@/providers/antd-theme";
import { getQueryClient } from "@/providers/query-client";

// antd dùng dayjs cho DatePicker; đặt locale một lần ở đây để mọi nơi
// hiển thị thứ/tháng bằng tiếng Việt.
dayjs.locale("vi");

export function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    // `layer` đẩy toàn bộ style antd vào @layer antd. Thứ tự layer khai báo
    // ở src/app/globals.css. Tắt prop này thì preflight của Tailwind sẽ đè
    // nền nút antd — bỏ nó đi là giao diện vỡ.
    <AntdRegistry layer>
      <ConfigProvider locale={viVN} theme={antdTheme}>
        {/* AntdApp cấp context cho message/notification/modal.
            Không có nó thì message.success() gọi tĩnh sẽ không nhận theme. */}
        <AntdApp>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
