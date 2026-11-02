import { Badge } from './Badge';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational' | 'info';

interface SeverityBadgeProps {
  severity: Severity | string;
  className?: string;
}

const severityMap: Record<string, { variant: 'critical' | 'warning' | 'info' | 'success' | 'default'; label: string }> = {
  critical: { variant: 'critical', label: 'Critical' },
  high: { variant: 'warning', label: 'High' },
  medium: { variant: 'info', label: 'Medium' },
  low: { variant: 'success', label: 'Low' },
  informational: { variant: 'default', label: 'Info' },
  info: { variant: 'default', label: 'Info' },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityMap[severity.toLowerCase()] || { variant: 'default' as const, label: severity };
  return <Badge variant={config.variant} dot className={className}>{config.label}</Badge>;
}
