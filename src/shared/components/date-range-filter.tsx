"use client";

import { DatePicker } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { cn } from "@/shared/utils/cn";

import {
  DATE_PRESETS,
  DATE_PRESET_LABELS,
  activeDatePreset,
  datePresetRange,
  todayInVietnam,
} from "@/shared/lib/date-presets";

type Range = { fromDate: string | null; toDate: string | null };

export function DateRangeFilter({
  fromDate,
  toDate,
  onChange,
}: {
  fromDate: string | null;
  toDate: string | null;
  onChange: (range: Range) => void;
}) {
  const today = todayInVietnam();
  const active = activeDatePreset(fromDate, toDate, today);
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-0.5 rounded-[9px] bg-nen-phu p-[3px] text-[12px] font-semibold">
        {DATE_PRESETS.map((preset) => {
          const selected = active === preset || (preset === "custom" && customOpen);
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                if (preset === "custom") {
                  setCustomOpen(true);
                  return;
                }
                setCustomOpen(false);
                // Bấm lại preset đang chọn = bỏ lọc ngày.
                onChange(
                  active === preset
                    ? { fromDate: null, toDate: null }
                    : datePresetRange(preset, today),
                );
              }}
              className={cn(
                "h-7 flex-1 cursor-pointer rounded-[7px] border-0",
                selected
                  ? "bg-nen-the text-chu-chinh shadow-[0_1px_2px_rgba(0,0,0,.08)]"
                  : "bg-transparent text-chu-phu",
              )}
            >
              {DATE_PRESET_LABELS[preset]}
            </button>
          );
        })}
      </div>
      <DatePicker.RangePicker
        className="w-full"
        format="DD/MM/YYYY"
        placeholder={["Từ", "Đến"]}
        allowClear
        value={fromDate && toDate ? [dayjs(fromDate), dayjs(toDate)] : null}
        onChange={(range) =>
          onChange({
            fromDate: range?.[0] ? range[0].format("YYYY-MM-DD") : null,
            toDate: range?.[1] ? range[1].format("YYYY-MM-DD") : null,
          })
        }
      />
    </div>
  );
}
