/** Format chart axis / crosshair prices — drop ".00" on whole numbers. */
export function formatChartPrice(price: number): string {
  const rounded = Math.round(price * 100) / 100;
  if (Number.isInteger(rounded) || Math.abs(rounded - Math.round(rounded)) < 1e-6) {
    return Math.round(rounded).toLocaleString("en-IN");
  }
  return rounded.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
