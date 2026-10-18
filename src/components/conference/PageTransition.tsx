import type { ReactNode } from "react";

/**
 * PageTransition — fades and slides the page content in on load.
 *
 * Pure CSS (.page-rise in globals.css) so it starts with the first paint:
 * content never waits for JavaScript to become visible.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="page-rise">{children}</div>;
}
