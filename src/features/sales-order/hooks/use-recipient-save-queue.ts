"use client";

import { useRef, useState } from "react";

import type { OrderRecipientsInput } from "../schemas/order.schema";

function sameRecipients(a: OrderRecipientsInput, b: OrderRecipientsInput) {
  if (a.partnerId !== b.partnerId) return false;
  if (a.staffIds.length !== b.staffIds.length) return false;
  const ids = new Set(a.staffIds);
  return b.staffIds.every((id) => ids.has(id));
}

/**
 * Người nhận lưu cả tập mỗi lần đổi. Chọn A rồi chọn B trước khi A lưu xong thì
 * tập của B phải dựa trên lựa chọn cục bộ (đã có A), và hai lần lưu phải đi lần
 * lượt — bắn song song thì bản đến server sau sẽ đè bản trước.
 * Khi rảnh và server đã khớp thì quay về đọc server; lưu lỗi thì bỏ phần chờ.
 */
export function useRecipientSaveQueue(
  server: OrderRecipientsInput,
  save: (input: OrderRecipientsInput) => Promise<boolean>,
) {
  const [pending, setPending] = useState<OrderRecipientsInput | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const queued = useRef<OrderRecipientsInput | null>(null);
  const running = useRef(false);

  // Điều chỉnh state ngay lúc render (không cần effect) khi server đã bắt kịp.
  if (pending && !inFlight && sameRecipients(pending, server)) {
    setPending(null);
  }

  async function drain() {
    if (running.current) return;
    running.current = true;
    setInFlight(true);
    try {
      while (queued.current) {
        const target = queued.current;
        queued.current = null;
        if (!(await save(target))) {
          // Cha đã báo lỗi; ô quay về người nhận đã lưu trên server.
          queued.current = null;
          setPending(null);
          break;
        }
      }
    } finally {
      running.current = false;
      setInFlight(false);
    }
  }

  function change(next: OrderRecipientsInput) {
    queued.current = next;
    setPending(next);
    void drain();
  }

  return { value: pending ?? server, change };
}
