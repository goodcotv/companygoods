type CornerBracketsProps = {
  className?: string;
  inset?: number;
};

/** Camera-style viewfinder corners with a short 45° chamfer. */
export function CornerBrackets({
  className = "",
  inset = 10,
}: CornerBracketsProps) {
  const arm = 22;
  const cut = 4;
  const stroke = 1;
  // Keep the stroke fully inside the SVG so parents with overflow:hidden don't clip it.
  const pad = stroke / 2;
  const size = arm + cut + pad;

  const corners = [
    {
      key: "tl",
      style: { top: inset, left: inset },
      d: `M ${size} ${pad} H ${cut + pad} L ${pad} ${cut + pad} V ${size}`,
    },
    {
      key: "tr",
      style: { top: inset, right: inset },
      d: `M ${pad} ${pad} H ${arm} L ${size - pad} ${cut + pad} V ${size}`,
    },
    {
      key: "bl",
      style: { bottom: inset, left: inset },
      d: `M ${pad} ${pad} V ${arm} L ${cut + pad} ${size - pad} H ${size}`,
    },
    {
      key: "br",
      style: { bottom: inset, right: inset },
      d: `M ${size - pad} ${pad} V ${arm} L ${arm} ${size - pad} H ${pad}`,
    },
  ] as const;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 ${className}`}
      aria-hidden
    >
      {corners.map(({ key, style, d }) => (
        <svg
          key={key}
          className="absolute overflow-visible"
          width={size}
          height={size}
          style={style}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
        >
          <path
            d={d}
            stroke="var(--frame)"
            strokeWidth={stroke}
            strokeLinecap="square"
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </div>
  );
}
