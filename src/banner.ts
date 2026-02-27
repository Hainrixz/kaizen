/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

export function printStartupBanner() {
  const wordmark = [
    "██╗  ██╗ █████╗ ██╗███████╗███████╗███╗   ██╗",
    "██║ ██╔╝██╔══██╗██║╚══███╔╝██╔════╝████╗  ██║",
    "█████╔╝ ███████║██║  ███╔╝ █████╗  ██╔██╗ ██║",
    "██╔═██╗ ██╔══██║██║ ███╔╝  ██╔══╝  ██║╚██╗██║",
    "██║  ██╗██║  ██║██║███████╗███████╗██║ ╚████║",
    "╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝",
  ];

  const mascot = [
    "                 /\\_/\\",
    "            ____/ o o \\____",
    "          /   __  ^  __   \\",
    "         /___/  \\_=_/  \\___\\",
    "         |  |  [====]  |  |",
    "         |  |   \\__/   |  |",
    "         |__|__________|__|",
    "            /_/      \\_\\",
  ];

  const banner = [
    "╔════════════════════════════════════════╗",
    "║   Built by @soyEnriqueRocha            ║",
    "║   In collaboration with @tododeia      ║",
    "║   Unauthorized rebranding is a violation of the license.",
    "╚════════════════════════════════════════╝",
  ];

  const personalityLine = "kaizen mode: focused, practical, and build-ready.";

  console.log("");
  console.log(wordmark.join("\n"));
  console.log("");
  console.log(mascot.join("\n"));
  console.log("");
  console.log(banner.join("\n"));
  console.log(personalityLine);
}
