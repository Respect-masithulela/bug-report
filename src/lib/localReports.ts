/** Tracking IDs of bug reports filed from this device (no account needed). */

const KEY = "asm_lab_reports";

export interface LocalReport {
  tracking_id: string;
  title: string;
  reported_at: string;
}

export function getLocalReports(): LocalReport[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addLocalReport(report: LocalReport) {
  const list = getLocalReports().filter((r) => r.tracking_id !== report.tracking_id);
  list.unshift(report);
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    /* storage unavailable */
  }
}

export const BUG_INTAKE_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bug-intake`;
