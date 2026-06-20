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
  OpenF1Stint,
  OpenF1TeamRadio,
  LapSnapshot,
} from "./types";
import * as cache from "./cache";

const BASE = "/api/openf1";

/** Small delay helper. */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Global request queue ──────────────────────────────────────────────────────
// OpenF1 enforces a strict rate limit (~5 req/s). We serialize ALL requests
// through a single queue with a 350ms gap between them so we never hit 429.

let queueRunning = false;
const requestQueue: Array<() => Promise<void>> = [];

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    requestQueue.push(async () => {
      try { resolve(await task()); } catch (e) { reject(e); }
    });
    if (!queueRunning) drainQueue();
  });
}

async function drainQueue(): Promise<void> {
  if (queueRunning) return;
  queueRunning = true;
  while (requestQueue.length > 0) {
    const task = requestQueue.shift()!;
    await task();
    if (requestQueue.length > 0) await delay(350); // gap between requests
  }
  queueRunning = false;
}

// ── URL-level response cache ──────────────────────────────────────────────────
// Same URL is never fetched more than once per browser session in memory,
// and is persisted in IndexedDB according to its dynamic lifecycle.

const responseCache = new Map<string, unknown>();
const inflightRequests = new Map<string, Promise<unknown>>();
export const completedSessions = new Set<number>();

/** Remove a single URL from the in-memory cache (force re-fetch on next call). */
export function clearCacheForUrl(url: string): void {
  responseCache.delete(url);
}

/**
 * Fetch JSON from OpenF1 through the global queue + cache (memory & IndexedDB).
 * Retries on 429 with exponential back-off before re-queuing.
 */
async function fetchJSON<T>(url: string, retries = 3): Promise<T> {
  // 1. Check in-memory cache first (instant)
  if (responseCache.has(url)) {
    return responseCache.get(url) as T;
  }

  // 2. Coalesce duplicate in-flight requests for the same URL
  if (inflightRequests.has(url)) {
    return inflightRequests.get(url) as Promise<T>;
  }

  // 3. Check persistent IndexedDB cache before entering the queue
  const cachedData = await cache.get<T>(url);
  if (cachedData !== null) {
    responseCache.set(url, cachedData);
    return cachedData;
  }

  const promise = enqueue(async (): Promise<T> => {
    // Double-check caches after queuing (another request may have resolved it)
    if (responseCache.has(url)) return responseCache.get(url) as T;
    
    const doubleCheckCached = await cache.get<T>(url);
    if (doubleCheckCached !== null) {
      responseCache.set(url, doubleCheckCached);
      return doubleCheckCached;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url);
      if (res.status === 429 && attempt < retries) {
        await delay(900 * Math.pow(2, attempt)); // 900ms, 1.8s, 3.6s
        continue;
      }
      if (!res.ok) throw new Error(`OpenF1 ${res.status}: ${res.statusText}`);
      const data = await res.json() as T;

      // Determine TTL for the resource
      let ttlMs: number | undefined;
      if (url.includes("/sessions")) {
        if (url.includes("session_key=latest")) {
          ttlMs = 15 * 1000; // 15s TTL for latest session check
        } else {
          const yearMatch = url.match(/[?&]year=(\d+)/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1], 10);
            const currentYear = new Date().getFullYear();
            if (year < currentYear) {
              ttlMs = undefined; // Past years are permanent
            } else {
              ttlMs = 6 * 60 * 60 * 1000; // Current season schedule: 6 hours
            }
          }
        }
      } else {
        // Other session-specific requests (laps, drivers, stints, team_radio, intervals)
        const sessionKeyMatch = url.match(/[?&]session_key=(\d+)/);
        if (sessionKeyMatch) {
          const sessionKey = parseInt(sessionKeyMatch[1], 10);
          if (completedSessions.has(sessionKey)) {
            ttlMs = undefined; // Completed sessions are permanent
          } else {
            ttlMs = 30 * 1000; // Active sessions: 30s
          }
        }
      }

      // Don't permanently cache empty arrays — these can be caused by rate limits.
      // If the result is empty, cap TTL at 60s so we retry soon.
      const isEmpty = Array.isArray(data) && (data as unknown[]).length === 0;
      const effectiveTtlMs = isEmpty ? Math.min(ttlMs ?? 60_000, 60_000) : ttlMs;

      // Write to both caches
      responseCache.set(url, data);
      await cache.set(url, data, effectiveTtlMs);
      return data;
    }
    throw new Error("OpenF1: max retries exceeded");
  });

  inflightRequests.set(url, promise);
  promise.finally(() => inflightRequests.delete(url));
  return promise as Promise<T>;
}

/**
 * Like fetchJSON but returns a fallback on any error (for non-critical endpoints).
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
  
  const sessions = await fetchJSON<OpenF1Session[]>(url);
  
  // Register completed sessions to cache permanent session-level data
  sessions.forEach(s => {
    if (s.session_key && s.date_end) {
      const endTime = new Date(s.date_end).getTime();
      if (endTime < Date.now() - 4 * 60 * 60 * 1000) {
        completedSessions.add(s.session_key);
      }
    }
  });

  return sessions;
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
  const session = sessions[0] ?? null;
  
  if (session && session.date_end) {
    const endTime = new Date(session.date_end).getTime();
    if (endTime < Date.now() - 4 * 60 * 60 * 1000) {
      completedSessions.add(session.session_key);
    }
  }

  return session;
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
 */
export async function getRaceSession(
  season: number,
  countryName: string,
  cityHint?: string
): Promise<{ session: OpenF1Session; sourceYear: number } | null> {
  const years = [season, season - 1, 2024, 2023];
  const uniqueYears = Array.from(new Set(years));

  const countryNameLower = countryName.toLowerCase();
  const hint = cityHint?.toLowerCase();

  for (const y of uniqueYears) {
    const sessions = await getSessions(y).catch(() => [] as OpenF1Session[]);
    const raceSessions = sessions.filter(s =>
      s.session_name?.toLowerCase() === "race" &&
      s.country_name?.toLowerCase() === countryNameLower
    );

    if (raceSessions.length > 0) {
      if (hint) {
        const match = raceSessions.find(s =>
          s.circuit_short_name?.toLowerCase().includes(hint) ||
          s.meeting_name?.toLowerCase().includes(hint)
        );
        if (match) return { session: match, sourceYear: y };
      }
      return { session: raceSessions[0], sourceYear: y };
    }
  }
  return null;
}

/**
 * Build lap-by-lap position snapshots from laps data.
 * Uses date_start timestamps from the laps endpoint to reconstruct
 * the running order at each lap.
 */
export function buildLapSnapshots(
  drivers: OpenF1Driver[],
  laps: OpenF1Lap[],
  raceControl: OpenF1RaceControl[],
  gridOrder?: string[],
  stints: OpenF1Stint[] = []
): LapSnapshot[] {
  if (drivers.length === 0 || laps.length === 0) return [];

  // Map driver_number → name_acronym
  const numToCode: Record<number, string> = {};
  const codeToNum: Record<string, number> = {};
  drivers.forEach(d => {
    numToCode[d.driver_number] = d.name_acronym;
    codeToNum[d.name_acronym] = d.driver_number;
  });

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

  // Find max lap completed by each driver
  const maxLapForDriver: Record<string, number> = {};
  laps.forEach(l => {
    const code = numToCode[l.driver_number];
    if (code) {
      maxLapForDriver[code] = Math.max(maxLapForDriver[code] || 0, l.lap_number);
    }
  });

  // DNF detection via race control & gap heuristic
  const retiredLaps: Record<string, number> = {};
  raceControl.forEach(rc => {
    if (rc.driver_number && (rc.message.toLowerCase().includes("retired") || rc.message.toLowerCase().includes("stopped"))) {
      const code = numToCode[rc.driver_number];
      if (code) {
        const lapNum = rc.lap_number || (maxLapForDriver[code] ? maxLapForDriver[code] + 1 : 1);
        retiredLaps[code] = Math.min(retiredLaps[code] || 999, lapNum);
      }
    }
  });

  // Heuristic: if a driver's max lap is less than maxLap - 3, they retired
  drivers.forEach(d => {
    const code = d.name_acronym;
    const maxCompleted = maxLapForDriver[code] || 0;
    if (maxCompleted > 0 && maxCompleted < maxLap - 3) {
      if (!retiredLaps[code]) {
        retiredLaps[code] = maxCompleted + 1;
      }
    }
  });

  // Helper: derive order at a lap by sorting entries by date_start (ascending).
  function orderFromLap(lapNum: number): string[] {
    const entries = lapsByNum[lapNum] ?? [];
    const withDate = entries
      .filter(l => l.date_start && numToCode[l.driver_number])
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
    return withDate.map(l => numToCode[l.driver_number]);
  }

  const lap2Order = orderFromLap(2);
  const startOrder = (gridOrder && gridOrder.length > 0) ? gridOrder : lap2Order;

  // Accumulate cumulative lap_duration per driver to compute realistic gaps
  const cumulativeTime: Record<string, number> = {};
  const snapshots: LapSnapshot[] = [];

  for (let lap = 0; lap <= maxLap; lap++) {
    let order: string[];
    if (lap === 0) {
      order = startOrder.length > 0 ? [...startOrder] : Object.values(numToCode);
    } else if (lap === 1) {
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
          gaps[code] = i * 1.2;
        }
      }
    });

    // Build stints map for this lap
    const stintsMap: Record<string, { compound: string; lapAge: number }> = {};
    drivers.forEach(d => {
      const code = d.name_acronym;
      const driverNum = d.driver_number;
      // Find stint matching this lap
      const matchingStint = stints.find(s =>
        s.driver_number === driverNum &&
        lap >= s.lap_start &&
        (s.lap_end === null || lap <= s.lap_end)
      );
      if (matchingStint) {
        stintsMap[code] = {
          compound: matchingStint.compound,
          lapAge: (lap - matchingStint.lap_start) + matchingStint.tyre_age_at_start,
        };
      } else {
        // Fallback stint compound
        stintsMap[code] = { compound: "MEDIUM", lapAge: lap };
      }
    });

    // Build sectors map for this lap
    const sectorsMap: Record<string, { s1: number | null; s2: number | null; s3: number | null }> = {};
    entries.forEach(l => {
      const code = numToCode[l.driver_number];
      if (code) {
        sectorsMap[code] = {
          s1: l.duration_sector_1,
          s2: l.duration_sector_2,
          s3: l.duration_sector_3,
        };
      }
    });

    // Build DNF list for this lap
    const activeDnf: string[] = [];
    Object.entries(retiredLaps).forEach(([code, retireLap]) => {
      if (lap >= retireLap) {
        activeDnf.push(code);
      }
    });

    // Build position changes delta
    const posChangesMap: Record<string, number> = {};
    const gridOrderForDelta = startOrder.length > 0 ? startOrder : order;
    order.forEach((code, i) => {
      const gridIndex = gridOrderForDelta.indexOf(code);
      if (gridIndex !== -1) {
        posChangesMap[code] = gridIndex - i;
      } else {
        posChangesMap[code] = 0;
      }
    });

    snapshots.push({
      lap,
      order,
      safetycar: scLaps.has(lap),
      gaps,
      dnf: activeDnf.length > 0 ? activeDnf : undefined,
      stints: Object.keys(stintsMap).length > 0 ? stintsMap : undefined,
      sectors: Object.keys(sectorsMap).length > 0 ? sectorsMap : undefined,
      posChanges: Object.keys(posChangesMap).length > 0 ? posChangesMap : undefined,
    });
  }

  return snapshots;
}

// ── Stints (tyre compound data) ───────────────────────────────────────────────

/**
 * Get all tyre stint data for a session.
 * Returns compound type (SOFT/MEDIUM/HARD/etc.) and lap ranges.
 */
export async function getStints(sessionKey: number): Promise<OpenF1Stint[]> {
  return fetchJSONSafe<OpenF1Stint[]>(
    `${BASE}/stints?session_key=${sessionKey}`,
    []
  );
}

// ── Team Radio ────────────────────────────────────────────────────────────────

/**
 * Get team radio recordings for a session.
 * Returns audio recording URLs with timestamps.
 */
export async function getTeamRadio(sessionKey: number): Promise<OpenF1TeamRadio[]> {
  return fetchJSONSafe<OpenF1TeamRadio[]>(
    `${BASE}/team_radio?session_key=${sessionKey}`,
    []
  );
}

/**
 * Get team radio for a specific driver in a session.
 */
export async function getDriverTeamRadio(
  sessionKey: number,
  driverNumber: number
): Promise<OpenF1TeamRadio[]> {
  return fetchJSONSafe<OpenF1TeamRadio[]>(
    `${BASE}/team_radio?session_key=${sessionKey}&driver_number=${driverNumber}`,
    []
  );
}
