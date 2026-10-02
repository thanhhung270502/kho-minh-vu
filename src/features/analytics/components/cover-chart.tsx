"use client";

import { Card, Segmented } from "antd";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { coverBucket, coverBucketLabel, visibleCoverBuckets, type CoverBucket } from "../lib/analysis";
import { FINISH_LABELS, FINISH_TYPES, type AnalysisRow, type AnalysisSettings, type FinishType } from "../types";

const BUCKET_COLORS: Record<CoverBucket, string> = {
  "no-data": "#bfbfbf",
  out: "#a8071a",
  "le-x": "#f5222d",
  "x-30": "#faad14",
  "31-90": "#52c41a",
  "91-364": "#1677ff",
  "ge-365": "#722ed1",
};

/** "Số ngày còn hàng" — đếm số mã theo nhóm, lọc theo loại hoàn thiện. */
export function CoverChart({ rows, settings }: { rows: AnalysisRow[]; settings: AnalysisSettings }) {
  const [finish, setFinish] = useState<FinishType | "all">("all");
  const picked = finish === "all" ? rows : rows.filter((r) => r.finish === finish);
  const data = visibleCoverBuckets(settings).map((bucket) => ({
    bucket,
    label: coverBucketLabel(bucket, settings),
    count: picked.filter((r) => coverBucket(r, settings) === bucket).length,
  }));
  const skipped = picked.filter((r) => coverBucket(r, settings) === null).length;

  return (
    <Card size="small" title="Số ngày còn hàng (số mã)">
      <div className="mb-2 max-w-full overflow-x-auto">
        <Segmented
          size="small"
          value={finish}
          onChange={(v) => setFinish(v as FinishType | "all")}
          options={[{ value: "all", label: "Tất cả" }, ...FINISH_TYPES.map((f) => ({ value: f, label: FINISH_LABELS[f] }))]}
        />
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={48} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${Number(v).toLocaleString("vi-VN")} mã`, "Số mã"]} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.bucket} fill={BUCKET_COLORS[d.bucket]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {skipped > 0 ? (
        <div className="text-xs text-chu-phu">
          Không tính {skipped.toLocaleString("vi-VN")} mã không tồn, không bán trong kỳ.
        </div>
      ) : null}
    </Card>
  );
}
