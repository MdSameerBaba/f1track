// ─────────────────────────────────────────────────────────────────────────────
// F1TRACK — OpenF1 API Client
// Free, open-source, real-time F1 data. No API key required.
// Base URL: https://api.openf1.org/v1/
// Provides: Live sessions, lap-by-lap positions, intervals, race control msgs
// ─────────────────────────────────────────────────────────────────────────────

import type {
  OpenF1Session,
  OpenF1Driver,
  OpenF1Position,
  OpenF1Lap,
  OpenF1Interval,
  OpenF1RaceControl,
} from "./types";

const BASE = "/api/openf1";

/** Small delay to avoid OpenF1 rate limits (429). */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch JSON from OpenF1 with retry on 429 (rate-limit) errors.
 * Retries up to 3 times with exponential back-off (800ms, 1600ms, 3200ms).
 */
async function fetchJSON<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 && attempt < retries) {
      await delay(800 * Math.pow(2, attempt)); // 800, 1600, 3200 ms
      continue;
    }
    if (!res.ok) throw new Error(`OpenF1 ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  }
  throw new Error("OpenF1: max retries exceeded");
}

/**
 * Fetch JSON but return a fallback value (default []) on ANY error.
 * Used for non-critical endpoints like race_control.
 */
async function fetchJSONSafe<T>(url: string, fallback: T): Promise<T> {
  try {
    return await fetchJSON<T>(url);
  } catch {
    return fallback;
  }
}

// ── Sessions ─────────────────────────────────────────────────────────────────

/**
 * Get all sessions for a given year, optionally filtered by country.
 * Example: getSessions(2026)
 * Example: getSessions(2026, "Australia")
 */
export async function getSessions(
  year: number,
  countryName?: string
): Promise<OpenF1Session[]> {
  let url = `${BASE}/sessions?year=${year}`;
  if (countryName) url += `&country_name=${encodeURIComponent(countryName)}`;
  return fetchJSON<OpenF1Session[]>(url);
}

/**
 * Get the most recent session (useful for "live" detection).
 */
export async function getLatestSession(): Promise<OpenF1Session | null> {
  const sessions = await fetchJSON<OpenF1Session[]>(
    `${BASE}/sessions?session_key=latest`
  );
  return sessions[0] ?? null;
}

/**
 * Get a specific session by key.
 */
export async function getSession(
  sessionKey: number
): Promise<OpenF1Session | null> {
  const sessions = await fetchJSON<OpenF1Session[]>(
    `${BASE}/sessions?session_key=${sessionKey}`
  );
  return sessions[0] ?? null;
}

// ── Drivers ──────────────────────────────────────────────────────────────────

/**
 * Get all drivers for a given session.
 * Example: getDrivers(9999)
 */
export async function getDrivers(
  sessionKey: number
): Promise<OpenF1Driver[]> {
  return fetchJSON<OpenF1Driver[]>(
    `${BASE}/drivers?session_key=${sessionKey}`
  );
}

// ── Positions (lap by lap) ───────────────────────────────────────────────────

/**
 * Get ALL position changes for a session.
 * This returns every position update — can be large.
 */
export async function getPositions(
  sessionKey: number
): Promise<OpenF1Position[]> {
  return fetchJSON<OpenF1Position[]>(
    `${BASE}/position?session_key=${sessionKey}`
  );
}

/**
 * Get position snapshots for a specific driver in a session.
 */
export async function getDriverPositions(
  sessionKey: number,
  driverNumber: number
): Promise<OpenF1Position[]> {
  return fetchJSON<OpenF1Position[]>(
    `${BASE}/position?session_key=${sessionKey}&driver_number=${driverNumber}`
  );
}

// ── Laps ─────────────────────────────────────────────────────────────────────

/**
 * Get all lap data for a session.
 */
export async function getLaps(
  sessionKey: number
): Promise<OpenF1Lap[]> {
  return fetchJSON<OpenF1Lap[]>(
    `${BASE}/laps?session_key=${sessionKey}`
  );
}

/**
 * Get lap data for a specific driver.
 */
export async function getDriverLaps(
  sessionKey: number,
  driverNumber: number
): Promise<OpenF1Lap[]> {
  return fetchJSON<OpenF1Lap[]>(
    `${BASE}/laps?session_key=${sessionKey}&driver_number=${driverNumber}`
  );
}

// ── Intervals (gaps) ─────────────────────────────────────────────────────────

/**
 * Get interval/gap data for a session.
 * Shows gap_to_leader and interval to car ahead for each driver.
 */
export async function getIntervals(
  sessionKey: number
): Promise<OpenF1Interval[]> {
  return fetchJSON<OpenF1Interval[]>(
    `${BASE}/intervals?session_key=${sessionKey}`
  );
}

// ── Race Control (safety car, flags, DRS) ────────────────────────────────────

/**
 * Get all race control messages for a session.
 * Includes: safety car deployments, flags, DRS enabled/disabled, etc.
 */
export async function getRaceControl(
  sessionKey: number
): Promise<OpenF1RaceControl[]> {
  return fetchJSONSafe<OpenF1RaceControl[]>(
    `${BASE}/race_control?session_key=${sessionKey}`,
    []
  );
}

// ── Country Name Normalization ────────────────────────────────────────────────

/**
 * Jolpica and OpenF1 use different country names for the same location.
 * This maps Jolpica names → OpenF1 names.
 */
const COUNTRY_ALIASES: Record<string, string[]> = {
  "USA": ["United States"],
  "United States": ["USA"],
  "UK": ["United Kingdom", "Great Britain"],
  "United Kingdom": ["UK", "Great Britain"],
  "UAE": ["United Arab Emirates", "Abu Dhabi"],
  "United Arab Emirates": ["UAE", "Abu Dhabi"],
};

function getCountryVariants(country: string): string[] {
  return [country, ...(COUNTRY_ALIASES[country] ?? [])];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find the Race session for a specific meeting (race weekend).
 * Tries the requested year first, then falls back to prior years
 * (e.g. 2025, 2024) so we can show real historical data when the
 * current season hasn't reached that round yet.
 * Also handles country name mismatches between APIs.
 * Uses cityHint to disambiguate countries with multiple races (e.g. USA → Miami/Austin/Las Vegas).
 */
export async function getRaceSession(
  year: number,
  countryName: string,
  cityHint?: string
): Promise<{ session: OpenF1Session; sourceYear: number } | null> {
  const yearsToTry = [year, year - 1, year - 2];
  const countryVariants = getCountryVariants(countryName);

  for (const y of yearsToTry) {
    for (const country of countryVariants) {
      try {
        const sessions = await getSessions(y, country);
        const raceSessions = sessions.filter(s => s.session_name === "Race");

        if (raceSessions.length === 0) continue;

        // If only one race in this country, return it
        if (raceSessions.length === 1) {
          return { session: raceSessions[0], sourceYear: y };
        }

        // Multiple races in same country — try to match by city/circuit
        if (cityHint) {
          const hint = cityHint.toLowerCase();
          const match = raceSessions.find(s =>
            s.circuit_short_name?.toLowerCase().includes(hint) ||
            s.meeting_name?.toLowerCase().includes(hint)
          );
          if (match) return { session: match, sourceYear: y };
        }

        // Fallback: return the first race session in this country
        return { session: raceSessions[0], sourceYear: y };
      } catch {
        // not available, try next variant/year
      }
    }
  }
  return null;
}

/**
 * Build lap-by-lap position snapshots from laps data.
 * Uses date_start timestamps from the laps endpoint to reconstruct
 * the running order at each lap — the driver who starts a lap first
 * is in the lead.  Lap 1 date_start is unreliable (grid detection
 * sequence), so we use the lap 2 order as a proxy for laps 0 and 1.
 */
export function buildLapSnapshots(
  drivers: OpenF1Driver[],
  laps: OpenF1Lap[],
  raceControl: OpenF1RaceControl[],
  gridOrder?: string[]
): { lap: number; order: string[]; safetycar: boolean; gaps: Record<string, number> }[] {
  if (drivers.length === 0 || laps.length === 0) return [];

  // Map driver_number → name_acronym
  const numToCode: Record<number, string> = {};
  drivers.forEach(d => { numToCode[d.driver_number] = d.name_acronym; });

  // Find max lap number
  const maxLap = laps.reduce((max, l) => Math.max(max, l.lap_number), 0);
  if (maxLap === 0) return [];

  // Get safety car laps
  const scLaps = new Set<number>();
  raceControl.forEach(rc => {
    if (rc.category === "SafetyCar" && rc.lap_number) {
      scLaps.add(rc.lap_number);
    }
  });

  // Group laps by lap_number
  const lapsByNum: Record<number, OpenF1Lap[]> = {};
  laps.forEach(l => {
    if (!lapsByNum[l.lap_number]) lapsByNum[l.lap_number] = [];
    lapsByNum[l.lap_number].push(l);
  });

  // Helper: derive order at a lap by sorting entries by date_start (ascending).
  // The driver who crosses the timing line first is in the lead.
  function orderFromLap(lapNum: number): string[] {
    const entries = lapsByNum[lapNum] ?? [];
    const withDate = entries
      .filter(l => l.date_start && numToCode[l.driver_number])
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
    return withDate.map(l => numToCode[l.driver_number]);
  }

  // For laps 0 and 1:
  // - If gridOrder is provided (from Jolpica qualifying data), use that for lap 0
  // - Otherwise fall back to lap 2 order (most accurate early indicator)
  const lap2Order = orderFromLap(2);
  const startOrder = (gridOrder && gridOrder.length > 0) ? gridOrder : lap2Order;

  // Accumulate cumulative lap_duration per driver to compute realistic gaps
  const cumulativeTime: Record<string, number> = {};

  const snapshots: { lap: number; order: string[]; safetycar: boolean; gaps: Record<string, number> }[] = [];

  for (let lap = 0; lap <= maxLap; lap++) {
    let order: string[];
    if (lap === 0) {
      // Use qualifying grid order if available, otherwise lap 2
      order = startOrder.length > 0 ? [...startOrder] : Object.values(numToCode);
    } else if (lap === 1) {
      // Lap 1: use lap 2 order (after start, before lap 1 date_start is unreliable)
      order = lap2Order.length > 0 ? [...lap2Order] : (startOrder.length > 0 ? [...startOrder] : Object.values(numToCode));
    } else {
      order = orderFromLap(lap);
      if (order.length === 0) continue; // skip laps with no data
    }

    // Update cumulative time from this lap's durations
    const entries = lapsByNum[lap] ?? [];
    entries.forEach(l => {
      const code = numToCode[l.driver_number];
      if (code && l.lap_duration && l.lap_duration > 0) {
        cumulativeTime[code] = (cumulativeTime[code] ?? 0) + l.lap_duration;
      }
    });

    // Compute gaps based on cumulative time difference to the leader
    const gaps: Record<string, number> = {};
    const leaderCode = order[0];
    const leaderTime = cumulativeTime[leaderCode] ?? 0;

    order.forEach((code, i) => {
      if (i === 0) {
        gaps[code] = 0;
      } else {
        const driverTime = cumulativeTime[code] ?? 0;
        if (leaderTime > 0 && driverTime > 0) {
          gaps[code] = Math.max(0, driverTime - leaderTime);
        } else {
          // Fallback: estimate based on position
          gaps[code] = i * 1.2;
        }
      }
    });

    snapshots.push({
      lap,
      order,
      safetycar: scLaps.has(lap),
      gaps,
    });
  }

  return snapshots;
}
