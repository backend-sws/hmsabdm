import React from "react"

/**
 * Standard Industrial Code 39 Barcode Generator
 * Generates vector SVG rectangles that print cleanly across all thermal barcode printers
 * and browsers without requiring 'Background graphics' to be enabled.
 */

const CODE39_PATTERNS: Record<string, string> = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  A: "100001001",
  B: "001001001",
  C: "101001000",
  D: "000011001",
  E: "100011000",
  F: "001011000",
  G: "000001101",
  H: "100001100",
  I: "001001100",
  J: "000011100",
  K: "100000011",
  L: "001000011",
  M: "101000010",
  N: "000010011",
  O: "100010010",
  P: "001010010",
  Q: "000000111",
  R: "100000110",
  S: "001000110",
  T: "000010110",
  U: "110000001",
  V: "011000001",
  W: "111000000",
  X: "010010001",
  Y: "110010000",
  Z: "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  $: "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
  "*": "010010100",
}

export interface BarcodeRect {
  x: number
  w: number
}

export function encodeCode39(text: string): { totalWidth: number; rects: BarcodeRect[] } {
  const clean = `*${(text || "").toUpperCase().replace(/[^0-9A-Z-. $/+%]/g, "-")}*`
  const rects: BarcodeRect[] = []
  let x = 0

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    const pat = CODE39_PATTERNS[ch] || CODE39_PATTERNS["-"]

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0
      const width = pat[j] === "1" ? 2.5 : 1

      if (isBar) {
        rects.push({ x, w: width })
      }
      x += width
    }
    // Inter-character narrow whitespace gap
    x += 1
  }

  return { totalWidth: Math.max(x, 1), rects }
}

/**
 * Returns raw SVG markup string for embedding in thermal print documents
 */
export function getBarcodeSvgString(code: string, heightPx = 30): string {
  const { totalWidth, rects } = encodeCode39(code)
  const rectsMarkup = rects
    .map(
      (r) =>
        `<rect x="${r.x.toFixed(1)}" y="0" width="${r.w.toFixed(1)}" height="${heightPx}" fill="#000000" style="fill:#000000;shape-rendering:crispEdges;" />`
    )
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} ${heightPx}" width="100%" height="${heightPx}" preserveAspectRatio="none" shape-rendering="crispEdges" style="width:100%;height:${heightPx}px;display:block;margin:0 auto;">${rectsMarkup}</svg>`
}

/**
 * React Component to render SVG barcode in screen previews
 */
export const BarcodeSvg: React.FC<{ code: string; className?: string; height?: number }> = ({
  code,
  className = "w-full h-7",
  height = 30,
}) => {
  const { totalWidth, rects } = encodeCode39(code)

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className={className}
      style={{ display: "block" }}
    >
      {rects.map((r, idx) => (
        <rect
          key={idx}
          x={r.x}
          y={0}
          width={r.w}
          height={height}
          fill="#000000"
          style={{ fill: "#000000" }}
        />
      ))}
    </svg>
  )
}
