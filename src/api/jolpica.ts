// ─────────────────────────────────────────────────────────────────────────────
// F1TRACK — Jolpica (Ergast successor) API Client
// Free, no API key required
// Base URL: https://api.jolpi.ca/ergast/f1/
// Provides: Schedule, Race Results, Driver & Constructor Standings
// ─────────────────────────────────────────────────────────────────────────────

import type {
  JolpicaRace,
  JolpicaRaceResult,
  JolpicaStandingsList,
  JolpicaQualifyingResult,
} from "./types";

const BASE = "/api/jolpica";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jolpica ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Season Schedule ──────────────────────────────────────────────────────────

interface ScheduleResponse {
  MRData: {
    RaceTable: {
      season: string;
      Races: JolpicaRace[];
    };
  };
}

/**
 * Fetch the full race calendar for a given season.
 * Example: getSchedule(2026)
 */
export async function getSchedule(season: number): Promise<JolpicaRace[]> {
  const data = await fetchJSON<ScheduleResponse>(
    `${BASE}/${season}.json`
  );
  return data.MRData.RaceTable.Races;
}

// ── Race Results ─────────────────────────────────────────────────────────────

interface ResultsResponse {
  MRData: {
    RaceTable: {
      season: string;
      round: string;
      Races: JolpicaRaceResult[];
    };
  };
}

/**
 * Fetch results for a specific race.
 * Example: getRaceResults(2026, 1)
 */
export async function getRaceResults(
  season: number,
  round: number
): Promise<JolpicaRaceResult | null> {
  const data = await fetchJSON<ResultsResponse>(
    `${BASE}/${season}/${round}/results.json`
  );
  return data.MRData.RaceTable.Races[0] ?? null;
}

/**
 * Fetch results for ALL completed races in a season.
 * Example: getAllResults(2026)
 */
export async function getAllResults(
  season: number
): Promise<JolpicaRaceResult[]> {
  const data = await fetchJSON<ResultsResponse>(
    `${BASE}/${season}/results.json?limit=500`
  );
  return data.MRData.RaceTable.Races;
}

// ── Qualifying Results ───────────────────────────────────────────────────────

interface QualifyingResponse {
  MRData: {
    RaceTable: {
      Races: {
        QualifyingResults?: {
          position: string;
          Driver: { code?: string; driverId: string };
          Q1?: string;
          Q2?: string;
          Q3?: string;
        }[];
      }[];
    };
  };
}

/**
 * Fetch qualifying grid order for a specific race.
 * Returns driver codes in qualifying position order.
 * Example: getQualifyingGrid(2026, 1) → ["RUS", "ANT", "HAD", ...]
 */
export async function getQualifyingGrid(
  season: number,
  round: number
): Promise<string[]> {
  const data = await fetchJSON<QualifyingResponse>(
    `${BASE}/${season}/${round}/qualifying.json`
  );
  const race = data.MRData.RaceTable.Races[0];
  if (!race?.QualifyingResults?.length) return [];
  const sorted = [...race.QualifyingResults].sort(
    (a, b) => Number(a.position) - Number(b.position)
  );
  return sorted.map(q => q.Driver.code ?? q.Driver.driverId.slice(0, 3).toUpperCase());
}

/**
 * Fetch full qualifying results including Q1/Q2/Q3 times.
 * Example: getQualifyingResults(2026, 1) → [{position, Driver, Constructor, Q1, Q2, Q3}, ...]
 */
export async function getQualifyingResults(
  season: number,
  round: number
): Promise<JolpicaQualifyingResult[]> {
  interface FullQualifyingResponse {
    MRData: {
      RaceTable: {
        Races: {
          QualifyingResults?: JolpicaQualifyingResult[];
        }[];
      };
    };
  }
  const data = await fetchJSON<FullQualifyingResponse>(
    `${BASE}/${season}/${round}/qualifying.json`
  );
  const race = data.MRData.RaceTable.Races[0];
  return race?.QualifyingResults ?? [];
}

// ── Driver Standings ─────────────────────────────────────────────────────────

interface StandingsResponse {
  MRData: {
    StandingsTable: {
      season: string;
      StandingsLists: JolpicaStandingsList[];
    };
  };
}

/**
 * Fetch current driver championship standings.
 * Example: getDriverStandings(2026)
 */
export async function getDriverStandings(
  season: number
): Promise<JolpicaStandingsList | null> {
  const data = await fetchJSON<StandingsResponse>(
    `${BASE}/${season}/driverStandings.json`
  );
  return data.MRData.StandingsTable.StandingsLists[0] ?? null;
}

/**
 * Fetch standings at a specific round.
 * Example: getDriverStandingsAtRound(2026, 5)
 */
export async function getDriverStandingsAtRound(
  season: number,
  round: number
): Promise<JolpicaStandingsList | null> {
  const data = await fetchJSON<StandingsResponse>(
    `${BASE}/${season}/${round}/driverStandings.json`
  );
  return data.MRData.StandingsTable.StandingsLists[0] ?? null;
}
