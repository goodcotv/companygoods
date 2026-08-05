import {
  BRACKET_STROKE,
  FRAME_BRACKET,
  buildCornerBrackets,
  cornerPosition,
  type CornerBracketGeometry,
} from "@/lib/corner-brackets";

type CornerBracketsProps = {
  className?: string;
  inset?: number;
  geometry?: CornerBracketGeometry;
};

/** Camera-style viewfinder corners with a 45° chamfer. */
export function CornerBrackets({
  className = "",
  inset = 10,
  geometry = FRAME_BRACKET,
}: CornerBracketsProps) {
  const { size, corners } = buildCornerBrackets(geometry);

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 ${className}`}
      aria-hidden
    >
      {corners.map(({ key, d }) => (
        <svg
          key={key}
          className="absolute overflow-visible"
          width={size}
          height={size}
          style={cornerPosition(key, inset)}
          viewBox={`0 0 ${size} ${size}`}
          fill="none"
        >
          <path
            d={d}
            stroke="var(--frame)"
            strokeWidth={BRACKET_STROKE}
            strokeLinecap="square"
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </div>
  );
}
