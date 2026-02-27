/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

export function printStartupBanner() {
  const banner = [
    "╔════════════════════════════════════════╗",
    "║   Built by @soyEnriqueRocha            ║",
    "║   In collaboration with @tododeia      ║",
    "║   Unauthorized rebranding is a violation of the license.",
    "╚════════════════════════════════════════╝",
  ];

  console.log(banner.join("\n"));
}
