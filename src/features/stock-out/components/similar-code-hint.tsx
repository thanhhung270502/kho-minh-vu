"use client";

import { Alert, App, Button } from "antd";

import { errorCode, explainError } from "@/shared/lib/errors";

import { useProposeMerge, useSimilarCodes } from "../hooks/useIssues";
import { exceedsStock, type IssueLine } from "../types";

function formatNumber(value: number): string {
  return Number(value).toLocaleString("vi-VN");
}

/** Đề nghị ghi trong vài giây gần đây coi là "vừa tạo"; cũ hơn là dòng đã có
 * từ trước (bấm lại lần hai trên cùng cặp — RPC trả về đúng dòng đang chờ). */
const JUST_CREATED_THRESHOLD_MS = 5000;

/** Hàm thuần riêng, KHÔNG nằm trong thân component — gọi `Date.now()` trực
 * tiếp trong hàm xử lý sự kiện của component bị react-hooks/purity chặn. */
function millisecondsSince(iso: string): number {
  return Date.now() - new Date(iso).getTime();
}

type Props = { issueId: string; line: IssueLine };

/**
 * D-14: nút "Đề nghị gộp hai mã" ở đây tuyệt đối không làm ba việc sau:
 * 1. không đổi dữ liệu mã hàng nào;
 * 2. không đụng tồn hay sổ cái kho;
 * 3. không chặn luồng ghi sổ — người dùng vẫn ghi sổ được ngay sau đó.
 * RPC đứng sau nút này chỉ ghi một dòng đề nghị chờ xử lý; gộp thật là một
 * phase riêng, chưa làm ở đây.
 */
export function SimilarCodeHint({ issueId, line }: Props) {
  const { message } = App.useApp();
  const isOver = exceedsStock(line);
  const warehouseId = line.warehouseId ?? "";

  // `enabled` bên trong useSimilarCodes chỉ bật khi mã hàng khác rỗng — dòng
  // không vượt tồn thì truyền vào "", không bắn RPC cho mọi dòng của phiếu.
  const similar = useSimilarCodes(isOver ? line.productId : "", warehouseId);
  const proposeMerge = useProposeMerge();

  if (!isOver) return null;

  const suggestions = similar.data ?? [];
  if (suggestions.length === 0) return null;

  async function propose(suggestionId: string) {
    try {
      const result = await proposeMerge.mutateAsync({
        productIdA: line.productId,
        productIdB: suggestionId,
        docId: issueId,
      });
      const ageMs = millisecondsSince(result.createdAt);
      if (ageMs > JUST_CREATED_THRESHOLD_MS) {
        message.info("Đề nghị này đã được ghi trước đó.");
      } else {
        message.success("Đã ghi lại đề nghị. Quản lý sẽ xem xét ở đợt gộp mã.");
      }
    } catch (error) {
      if (errorCode(error) === "42501") {
        message.error("Chỉ quản lý và văn phòng đề nghị gộp mã.");
        return;
      }
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((suggestion) => (
        <Alert
          key={suggestion.productId}
          type="info"
          showIcon
          title={`Mã ${suggestion.productCode} — ${suggestion.productName} đang còn ${formatNumber(
            suggestion.stock,
          )} ở ${suggestion.warehouseName}. Có phải cùng một món hàng bị tách thành hai mã không?`}
          action={
            <Button
              size="small"
              loading={proposeMerge.isPending}
              onClick={() => void propose(suggestion.productId)}
            >
              Đề nghị gộp hai mã
            </Button>
          }
        />
      ))}
    </div>
  );
}
