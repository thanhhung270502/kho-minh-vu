/** Đường xu hướng SVG thuần — không thư viện biểu đồ, không trục, không tooltip. */
export function Sparkline({
  values,
  width = 56,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const step = 80 / (values.length - 1);
  const points = values
    .map((value, index) => {
      const y = span === 0 ? 14 : 26 - ((value - min) / span) * 24;
      return `${(index * step).toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 80 28"
      preserveAspectRatio="none"
      width={width}
      height={height}
      aria-hidden
      className="shrink-0 text-chu-chinh"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
