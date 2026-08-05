export type CornerBracketGeometry = {
  arm: number;
  cut: number;
};

/** Page/list frames. */
export const FRAME_BRACKET: CornerBracketGeometry = { arm: 30, cut: 14 };

/** Small caption panels, where the full-size corners would collide. */
export const COMPACT_BRACKET: CornerBracketGeometry = { arm: 16, cut: 8 };

export const BRACKET_STROKE = 1;

/**
 * Camera-style viewfinder corners: two arms meeting at a 45° chamfer.
 * Returns the SVG box size plus a path per corner, all sharing one square viewBox.
 */
export function buildCornerBrackets({ arm, cut }: CornerBracketGeometry) {
  const pad = BRACKET_STROKE / 2;
  const size = arm + cut + BRACKET_STROKE;
  const near = pad;
  const far = size - pad;
  const bend = cut + pad;
  const turn = size - cut - pad;

  return {
    size,
    corners: [
      {
        key: "tl",
        d: `M ${far} ${near} H ${bend} L ${near} ${bend} V ${far}`,
      },
      {
        key: "tr",
        d: `M ${near} ${near} H ${turn} L ${far} ${bend} V ${far}`,
      },
      {
        key: "bl",
        d: `M ${near} ${near} V ${turn} L ${bend} ${far} H ${far}`,
      },
      {
        key: "br",
        d: `M ${far} ${near} V ${turn} L ${turn} ${far} H ${near}`,
      },
    ],
  };
}

export function cornerPosition(key: string, inset: number) {
  return {
    top: key.startsWith("t") ? inset : undefined,
    bottom: key.startsWith("b") ? inset : undefined,
    left: key.endsWith("l") ? inset : undefined,
    right: key.endsWith("r") ? inset : undefined,
  };
}
