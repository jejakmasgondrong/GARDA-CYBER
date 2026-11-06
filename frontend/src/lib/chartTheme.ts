/**
 * Palet diagram bersama.
 *
 * Sebelumnya warna chart diduplikasi di tiap halaman. Satu sumber di sini
 * supaya diagram di Dashboard, Findings, dan Audit Logs memakai warna yang sama
 * untuk arti yang sama (mis. "critical" selalu merah).
 */
export const CHART = {
  primary: '#2685F6',
  electric: '#38BDF8',
  success: '#22C55E',
  warning: '#F59E0B',
  critical: '#EF4444',
  text: '#94A3B8',
  border: '#26364D',
  card: '#162338',
} as const;

/** Warna per tingkat keyakinan temuan. */
export const CONFIDENCE_COLORS: Record<string, string> = {
  high: CHART.critical,
  medium: CHART.warning,
  low: CHART.text,
};

/** Warna per status insiden. */
export const INCIDENT_STATUS_COLORS: Record<string, string> = {
  open: CHART.warning,
  in_progress: CHART.primary,
  contained: CHART.electric,
  closed: CHART.success,
};

/** Warna per status temuan. */
export const FINDING_STATUS_COLORS: Record<string, string> = {
  open: CHART.warning,
  triaged: CHART.primary,
  remediated: CHART.success,
  false_positive: CHART.text,
};

/** Gaya kotak tooltip recharts agar sesuai tema gelap. */
export const TOOLTIP_STYLE = {
  background: CHART.card,
  border: `1px solid ${CHART.border}`,
  borderRadius: 8,
  color: '#E5EDF7',
  fontSize: 12,
};
