/**
 * Browser side of the per-session report PIN (see src/lib/report-pin.ts).
 * The PIN is kept in sessionStorage (cleared when the tab closes) and shared by
 * the chair's and the rapporteur's editors of the same session.
 */
const KEY = (trackId: number) => `sqaps-report-pin-${trackId}`;
export const PIN_EVENT = "sqaps-report-pin";

export function getPin(trackId: number): string {
  try {
    return window.sessionStorage.getItem(KEY(trackId)) ?? "";
  } catch {
    return "";
  }
}

function announce(trackId: number) {
  window.dispatchEvent(new CustomEvent(PIN_EVENT, { detail: trackId }));
}

export function setPin(trackId: number, pin: string) {
  try {
    window.sessionStorage.setItem(KEY(trackId), pin);
  } catch {
    // storage blocked — the PIN just isn't remembered
  }
  announce(trackId);
}

export function clearPin(trackId: number) {
  try {
    window.sessionStorage.removeItem(KEY(trackId));
  } catch {
    // ignore
  }
  announce(trackId);
}

/** Headers to send with report / AI requests for this session. */
export function pinHeaders(trackId: number): Record<string, string> {
  const pin = typeof window === "undefined" ? "" : getPin(trackId);
  return pin ? { "x-report-pin": pin } : {};
}
