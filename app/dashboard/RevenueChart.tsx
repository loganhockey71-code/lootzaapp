export function RevenueChart({ points }: { points: number[] }) {
  const max = Math.max(...points, 1);
  const width = 600;
  const height = 180;
  const step = width / (points.length - 1);
  const coords = points.map((v, i) => [i * step, height - (v / max) * (height - 20) - 10] as const);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full sm:h-48" preserveAspectRatio="none">
      <defs>
        <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#revenue-fill)" />
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="#10b981" stroke="white" strokeWidth={2} />
      ))}
    </svg>
  );
}
