export function riskColor(risk: string): string {
  switch (risk) {
    case "low":
      return "var(--color-risk-low)";
    case "medium":
      return "var(--color-risk-medium)";
    case "high":
      return "var(--color-risk-high)";
    case "critical":
      return "var(--color-risk-critical)";
    default:
      return "var(--color-ink-dim)";
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "high":
      return "var(--color-risk-critical)";
    case "medium":
      return "var(--color-risk-medium)";
    default:
      return "var(--color-risk-low)";
  }
}

export function clampPercent(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
