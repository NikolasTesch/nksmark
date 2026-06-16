export function generateWatermarkSVG(width = 400, height = 400): string {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="watermark" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse">
          <text x="150" y="150"
                transform="rotate(-30, 150, 150)"
                font-family="Arial, sans-serif"
                font-size="32"
                font-weight="bold"
                fill="rgba(0,0,0,0.12)"
                text-anchor="middle"
                dominant-baseline="middle">
            NKS Art
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#watermark)" />
    </svg>
  `
}
