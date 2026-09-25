"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Button, Descriptions, Input, Modal, Progress, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useVoidSession } from "../hooks/useStocktake";
import { SESSION_STATUS_COLORS, SESSION_STATUS_LABELS, sessionStatus } from "../lib/session-status";
import { voidSessionSchema, type VoidSessionInput } from "../schemas/stocktake.schema";
import type { StocktakeSession } from "../types";

type Props = { session: StocktakeSession; canVoid: boolean };

/**
 * Đầu phiên kiểm kê: số phiên, kho, phạm vi, tiến độ đếm, trạng thái, nút hủy
 * phiên. Khuôn `receipt-header.tsx` (Descriptions) + `void-receipt-dialog.tsx`
 * (hộp xác nhận hủy), nhưng dùng RHF cho ô lý do (khác `void-receipt-dialog.tsx`
 * dùng state thường — theo đúng yêu cầu plan).
 */
export function SessionHeader({ session, canVoid }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [voidOpen, setVoidOpen] = useState(false);
  const voidSession = useVoidSession(session.id);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<VoidSessionInput>({
    resolver: zodResolver(voidSessionSchema),
    defaultValues: { reason: "" },
  });

  const status = sessionStatus({
    state: session.state,
    counted: session.countedCount,
    scope: session.scopeCount,
    recount: session.recountCount,
  });

  function closeVoid() {
    if (voidSession.isPending) return;
    reset({ reason: "" });
    setVoidOpen(false);
  }

  async function submitVoid(values: VoidSessionInput) {
    try {
      await voidSession.mutateAsync(values.reason);
      message.success(`Đã hủy phiên ${session.docNo}`);
      closeVoid();
      router.push("/kiem-ke");
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("root", { message: "Bạn không được hủy phiên này." });
        return;
      }
      if (errorCode(caught) === "23514" && isPostgrestError(caught)) {
        setError("reason", { message: caught.message });
        return;
      }
      const explained = explainError(caught);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Typography.Title level={4} className="mb-0">
          {session.docNo}
        </Typography.Title>

        {canVoid && session.state === "NHAP_LIEU" ? (
          <Button danger onClick={() => setVoidOpen(true)}>
            Hủy phiên
          </Button>
        ) : null}
      </div>

      {session.state === "HOAN_THANH" ? (
        <Alert
          type="success"
          showIcon
          title={
            session.postedAt
              ? `Đã duyệt lúc ${dayjs(session.postedAt).format("HH:mm DD/MM/YYYY")} — tồn đã về đúng số đếm; phiếu không sửa được.`
              : "Đã duyệt — tồn đã về đúng số đếm; phiếu không sửa được."
          }
        />
      ) : null}

      {session.state === "DA_HUY" ? (
        <Alert type="warning" showIcon title="Phiên đã hủy — không đếm/duyệt được nữa." />
      ) : null}

      {session.state === "NHAP_LIEU" && session.scopeCount === 0 ? (
        <Alert
          type="info"
          showIcon
          title="Phiên này không có mã nào để đếm"
          description={`Phạm vi chỉ gồm mã có kho mặc định là ${session.warehouseName} hoặc đang có tồn khác 0 tại kho này. Hủy phiên rồi mở lại với kho hoặc nhóm hàng khác.`}
        />
      ) : null}

      <Descriptions
        bordered
        size="small"
        column={{ xs: 1, sm: 2, lg: 4 }}
        items={[
          { key: "warehouse", label: "Kho", children: session.warehouseName },
          { key: "scope", label: "Phạm vi", children: session.categoryNames ?? "Toàn kho" },
          {
            key: "date",
            label: "Ngày mở",
            children: dayjs(session.createdAt).format("DD/MM/YYYY"),
          },
          { key: "createdBy", label: "Người mở", children: session.createdBy },
          {
            key: "status",
            label: "Trạng thái",
            children: (
              <Tag color={SESSION_STATUS_COLORS[status]}>{SESSION_STATUS_LABELS[status]}</Tag>
            ),
          },
          {
            key: "progress",
            label: "Tiến độ đếm",
            children: (
              <div className="flex flex-wrap items-center gap-3">
                <Progress
                  percent={
                    session.scopeCount > 0
                      ? Math.round((session.countedCount / session.scopeCount) * 100)
                      : 0
                  }
                  className="max-w-56"
                />
                <Typography.Text type="secondary" className="text-xs">
                  {session.countedCount}/{session.scopeCount}
                  {session.recountCount > 0 ? ` — chờ đếm lại: ${session.recountCount}` : ""}
                </Typography.Text>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={voidOpen}
        title={`Hủy phiên ${session.docNo}?`}
        okText="Hủy phiên"
        okButtonProps={{ danger: true }}
        cancelText="Thôi"
        confirmLoading={voidSession.isPending}
        onOk={() => void handleSubmit(submitVoid)()}
        onCancel={closeVoid}
      >
        {errors.root ? (
          <Alert className="mb-3" type="error" showIcon title={errors.root.message} />
        ) : null}

        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="Phiên chưa duyệt nên chưa đụng tồn — hủy là đóng phiếu lại, không sinh bút toán nào."
        />

        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <>
              <Input.TextArea
                {...field}
                autoFocus
                rows={3}
                placeholder="Lý do hủy (lưu vào phiếu)"
                status={errors.reason ? "error" : undefined}
              />
              {errors.reason ? (
                <Typography.Text type="danger" className="mt-1 block text-xs">
                  {errors.reason.message}
                </Typography.Text>
              ) : null}
            </>
          )}
        />
      </Modal>
    </div>
  );
}
