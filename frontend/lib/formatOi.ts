/** Indian numbering: L = lakh (1e5), Cr = crore (1e7). */
export function formatOiCompact(value: number): string {
  const n = Math.abs(value);
  if (n >= 1e7) {
    const cr = value / 1e7;
    return `${cr >= 10 ? cr.toFixed(0) : cr.toFixed(2)}Cr`;
  }
  if (n >= 1e5) {
    const lakhs = value / 1e5;
    return `${lakhs >= 100 ? lakhs.toFixed(0) : lakhs.toFixed(0)}L`;
  }
  if (n >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return String(Math.round(value));
}

export function formatOiCr(value: number): string {
  return `${(value / 1e7).toFixed(2)}Cr`;
}
