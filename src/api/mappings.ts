// ─────────────────────────────────────────────────────────────────────────────
// F1TRACK — Country code → flag emoji & team color mappings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a 3-letter country code to flag emoji.
 * Uses regional indicator symbols.
 */
export function countryCodeToFlag(code: string): string {
  // Map common F1 nationality strings to 2-letter ISO codes
  const nationalityMap: Record<string, string> = {
    // 3-letter codes (OpenF1)
    GBR: "GB", NLD: "NL", AUS: "AU", MCO: "MC", ESP: "ES",
    MEX: "MX", FIN: "FI", CAN: "CA", FRA: "FR", GER: "DE",
    DEN: "DK", JPN: "JP", THA: "TH", CHN: "CN", ITA: "IT",
    NZL: "NZ", ARG: "AR", BRA: "BR", USA: "US", AUT: "AT",
    BEL: "BE", HUN: "HU", POL: "PL", RUS: "RU", SUI: "CH",
    SWE: "SE", IND: "IN", ISR: "IL", COL: "CO", IDN: "ID",
    // Jolpica nationality strings
    British: "GB", Dutch: "NL", Australian: "AU", Monegasque: "MC",
    Spanish: "ES", Mexican: "MX", Finnish: "FI", Canadian: "CA",
    French: "FR", German: "DE", Danish: "DK", Japanese: "JP",
    Thai: "TH", Chinese: "CN", Italian: "IT", "New Zealander": "NZ",
    Argentine: "AR", Brazilian: "BR", American: "US", Austrian: "AT",
    Belgian: "BE", Hungarian: "HU", Polish: "PL", Russian: "RU",
    Swiss: "CH", Swedish: "SE", Indian: "IN", Israeli: "IL",
    Colombian: "CO", Indonesian: "ID",
  };

  const iso2 = nationalityMap[code] ?? code.slice(0, 2).toUpperCase();
  if (iso2.length !== 2) return "🏁";

  const codePoints = [...iso2].map(
    c => 0x1f1e6 + c.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

/**
 * Convert a country name to its flag emoji for race locations.
 */
export function countryNameToFlag(country: string): string {
  const map: Record<string, string> = {
    Australia: "🇦🇺", China: "🇨🇳", Japan: "🇯🇵", Bahrain: "🇧🇭",
    "Saudi Arabia": "🇸🇦", USA: "🇺🇸", Canada: "🇨🇦", Monaco: "🇲🇨",
    Spain: "🇪🇸", Austria: "🇦🇹", UK: "🇬🇧", Belgium: "🇧🇪",
    Hungary: "🇭🇺", Netherlands: "🇳🇱", Italy: "🇮🇹", Azerbaijan: "🇦🇿",
    Singapore: "🇸🇬", Mexico: "🇲🇽", Brazil: "🇧🇷", Qatar: "🇶🇦",
    UAE: "🇦🇪", "United Arab Emirates": "🇦🇪", "Abu Dhabi": "🇦🇪",
  };
  return map[country] ?? "🏁";
}

/**
 * Map team names from APIs to consistent color hex values.
 * Falls back to OpenF1's team_colour if available.
 */
export function teamColor(teamName: string, apiColor?: string): string {
  const normalized = teamName.toLowerCase();
  const colorMap: Record<string, string> = {
    mclaren: "#FF8000",
    "red bull": "#3671C6",
    "red bull racing": "#3671C6",
    mercedes: "#27F4D2",
    ferrari: "#E8002D",
    "aston martin": "#358C75",
    alpine: "#FF87BC",
    williams: "#64C4FF",
    haas: "#B6BABD",
    "haas f1 team": "#B6BABD",
    "rb": "#6692FF",
    "racing bulls": "#6692FF",
    "visa cash app rb": "#6692FF",
    "kick sauber": "#C8B800",
    sauber: "#C8B800",
    audi: "#C8B800",
    alphatauri: "#6692FF",
    "alfa romeo": "#C8B800",
  };

  for (const [key, color] of Object.entries(colorMap)) {
    if (normalized.includes(key)) return color;
  }

  // Fallback to API-provided color
  if (apiColor) return `#${apiColor}`;
  return "#888888";
}
