// ─────────────────────────────────────────────────────────────────────────────
// F1TRACK — React Hooks for fetching F1 data
// Uses Jolpica API (schedule, standings, results) + OpenF1 (live race data)
// Falls back to static data if APIs are unavailable
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import * as jolpica from "../api/jolpica";
import * as openf1 from "../api/openf1";
import { countryCodeToFlag, countryNameToFlag, teamColor } from "../api/mappings";
import type {
  Race, Driver, Standing, LapSnapshot, Highlight,
  JolpicaRace, OpenF1Session, OpenF1Driver,
} from "../api/types";
import { FALLBACK_DRIVERS, FALLBACK_RACES, FALLBACK_STANDINGS, FALLBACK_HIGHLIGHTS } from "./fallbackData";

// ── Generic async hook ───────────────────────────────────────────────────────

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err: any) {
      setState({ data: null, loading: false, error: err.message ?? "Unknown error" });
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// ── Schedule Hook ────────────────────────────────────────────────────────────

function parseJolpicaDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function jolpicaRaceToRace(jr: JolpicaRace, now: Date): Race {
  const raceDate = parseJolpicaDate(jr.date);
  const hasSprint = !!jr.Sprint;
  const country = jr.Circuit.Location.country;

  // Determine status
  const raceDayEnd = new Date(raceDate);
  raceDayEnd.setDate(raceDayEnd.getDate() + 1);

  let status: Race["status"] = "upcoming";
  if (now >= raceDayEnd) {
    status = "completed";
  }

  // Friday & Saturday dates
  const fp1Date = jr.FirstPractice
    ? parseJolpicaDate(jr.FirstPractice.date)
    : new Date(raceDate.getTime() - 2 * 86400000);
  const qualDate = jr.Qualifying
    ? parseJolpicaDate(jr.Qualifying.date)
    : new Date(raceDate.getTime() - 86400000);

  return {
    round: Number(jr.round),
    name: jr.raceName,
    circuit: jr.Circuit.circuitName,
    circuitId: jr.Circuit.circuitId,
    city: jr.Circuit.Location.locality,
    country: countryNameToFlag(country),
    countryCode: country,
    dates: {
      fri: formatDateShort(fp1Date),
      sat: formatDateShort(qualDate),
      sun: formatDateShort(raceDate),
    },
    raceDate,
    sprint: hasSprint,
    status,
  };
}

export function useSchedule(season: number) {
  const result = useAsync(async () => {
    const apiRaces = await jolpica.getSchedule(season);
    const now = new Date();
    const races = apiRaces.map(r => jolpicaRaceToRace(r, now));

    // Mark the next race
    const upcoming = races.filter(r => r.status === "upcoming");
    if (upcoming.length > 0) {
      upcoming[0].status = "next";
    }

    return races;
  }, [season]);

  // Fall back to static data on error
  const races = result.data ?? (result.error ? FALLBACK_RACES : null);

  return {
    races,
    loading: result.loading && !races,
    error: result.error,
    isLive: !!result.data,
    refetch: result.refetch,
  };
}

// ── Standings Hook ───────────────────────────────────────────────────────────

export function useStandings(season: number) {
  const result = useAsync(async () => {
    const standingsList = await jolpica.getDriverStandings(season);
    if (!standingsList) return null;

    const standings: Standing[] = standingsList.DriverStandings.map(ds => ({
      position: Number(ds.position),
      id: ds.Driver.code ?? ds.Driver.driverId.slice(0, 3).toUpperCase(),
      name: `${ds.Driver.givenName} ${ds.Driver.familyName}`,
      team: ds.Constructors[0]?.name ?? "Unknown",
      teamColor: teamColor(ds.Constructors[0]?.name ?? ""),
      pts: Number(ds.points),
      wins: Number(ds.wins),
    }));

    return {
      standings,
      afterRound: Number(standingsList.round),
    };
  }, [season]);

  const fallback = result.error
    ? { standings: FALLBACK_STANDINGS, afterRound: 1 }
    : null;

  return {
    standings: result.data?.standings ?? fallback?.standings ?? null,
    afterRound: result.data?.afterRound ?? fallback?.afterRound ?? 0,
    loading: result.loading && !result.data && !fallback,
    error: result.error,
    isLive: !!result.data,
  };
}

// ── Race Results Hook ────────────────────────────────────────────────────────

export function useRaceResults(season: number, round: number) {
  const result = useAsync(async () => {
    const raceResult = await jolpica.getRaceResults(season, round);
    if (!raceResult) return null;

    return raceResult.Results.map(r => ({
      position: Number(r.position),
      id: r.Driver.code ?? r.Driver.driverId.slice(0, 3).toUpperCase(),
      name: `${r.Driver.givenName} ${r.Driver.familyName}`,
      team: r.Constructor.name,
      teamColor: teamColor(r.Constructor.name),
      points: Number(r.points),
      grid: Number(r.grid),
      status: r.status,
      time: r.Time?.time ?? r.status,
      fastestLap: r.FastestLap
        ? { time: r.FastestLap.Time.time, lapNumber: Number(r.FastestLap.lap) }
        : undefined,
    }));
  }, [season, round]);

  return {
    results: result.data,
    loading: result.loading,
    error: result.error,
  };
}

// ── Live Race Data Hook (OpenF1 → Jolpica fallback → simulation) ─────────────

export function useLiveRaceData(
  season: number,
  countryName: string,
  cityHint?: string,
  round?: number
) {
  const [lapData, setLapData] = useState<LapSnapshot[] | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>(FALLBACK_DRIVERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [dataSource, setDataSource] = useState<"openf1" | "jolpica" | "simulation">("simulation");
  const [sourceYear, setSourceYear] = useState<number | null>(null);

  useEffect(() => {
    if (!countryName) return;
    let cancelled = false;

    async function fetchRaceData() {
      setLoading(true);
      setError(null);
      setSourceYear(null);

      // ── Attempt 1: OpenF1 (full lap-by-lap data) ──────────────────────
      try {
        console.log("[F1TRACK] OpenF1: Fetching race data for", season, countryName, cityHint);

        const found = await openf1.getRaceSession(season, countryName, cityHint);
        console.log("[F1TRACK] OpenF1: getRaceSession →", found
          ? `session_key=${found.session.session_key}, year=${found.sourceYear}`
          : "NOT FOUND");

        if (!found) throw new Error("Session not found");
        if (cancelled) return;

        const { session: raceSession, sourceYear: yr } = found;
        const sessionKey = raceSession.session_key;

        // Sequential fetches to avoid OpenF1 rate limits
        const driverData = await openf1.getDrivers(sessionKey);
        console.log("[F1TRACK] OpenF1: Drivers:", driverData.length);
        if (cancelled) return;

        const lapRecords = await openf1.getLaps(sessionKey);
        console.log("[F1TRACK] OpenF1: Laps:", lapRecords.length);
        if (cancelled) return;

        const rcData = await openf1.getRaceControl(sessionKey);
        console.log("[F1TRACK] OpenF1: RaceControl:", rcData.length);
        if (cancelled) return;

        const drvs: Driver[] = driverData.map(d => ({
          id: d.name_acronym,
          number: d.driver_number,
          name: d.full_name ?? d.broadcast_name,
          team: d.team_name,
          color: teamColor(d.team_name, d.team_colour),
          flag: countryCodeToFlag(d.country_code),
        }));

        // Fetch Jolpica grid data for accurate starting positions
        let gridOrder: string[] | undefined;
        if (round && round > 0) {
          try {
            const jolpicaResult = await jolpica.getRaceResults(yr, round).catch(() => null);
            if (jolpicaResult?.Results) {
              const hasGrid = jolpicaResult.Results.some(r => r.grid != null && Number(r.grid) > 0);
              if (hasGrid) {
                const gridSorted = [...jolpicaResult.Results]
                  .filter(r => r.grid != null && Number(r.grid) > 0)
                  .sort((a, b) => Number(a.grid) - Number(b.grid));
                gridOrder = gridSorted.map(r =>
                  r.Driver.code ?? r.Driver.driverId.slice(0, 3).toUpperCase()
                );
              } else {
                // Grid is null in results — fetch qualifying
                gridOrder = await jolpica.getQualifyingGrid(yr, round).catch(() => undefined as string[] | undefined);
              }
              console.log("[F1TRACK] Grid order:", gridOrder?.slice(0, 5));
            }
          } catch {
            // Grid data unavailable — will use lap 2 order as fallback
          }
        }

        const snapshots = openf1.buildLapSnapshots(driverData, lapRecords, rcData, gridOrder);
        console.log("[F1TRACK] OpenF1: Snapshots:", snapshots.length,
          "| P1-5 first:", snapshots[0]?.order?.slice(0, 5),
          "| P1-5 last:", snapshots[snapshots.length - 1]?.order?.slice(0, 5));

        if (snapshots.length > 0 && !cancelled) {
          setDrivers(drvs);
          setLapData(snapshots);
          setIsLive(true);
          setDataSource("openf1");
          setSourceYear(yr);
          setLoading(false);
          return; // SUCCESS — done
        }
        throw new Error("No lap snapshots built");
      } catch (openf1Err: any) {
        console.warn("[F1TRACK] OpenF1 failed:", openf1Err.message);
      }

      if (cancelled) return;

      // ── Attempt 2: Jolpica race results (correct order, simulated laps) ─
      if (round && round > 0) {
        try {
          console.log("[F1TRACK] Jolpica: Fetching results for", season, "round", round);

          // Try current season, then prior years
          let raceResult = await jolpica.getRaceResults(season, round).catch(() => null);
          let usedYear = season;

          if (!raceResult && season > 2024) {
            raceResult = await jolpica.getRaceResults(season - 1, round).catch(() => null);
            usedYear = season - 1;
          }

          if (raceResult && raceResult.Results.length > 0 && !cancelled) {
            console.log("[F1TRACK] Jolpica: Got", raceResult.Results.length, "results for year", usedYear);

            // Check if grid data exists in race results
            const hasGridData = raceResult.Results.some(r => r.grid != null && Number(r.grid) > 0);
            let qualifyingGrid: string[] | undefined;

            if (!hasGridData) {
              // Grid data is null — fetch qualifying results separately
              try {
                qualifyingGrid = await jolpica.getQualifyingGrid(usedYear, round);
                console.log("[F1TRACK] Jolpica: Qualifying grid:", qualifyingGrid.slice(0, 5));
              } catch {
                console.warn("[F1TRACK] Jolpica: Qualifying data unavailable");
              }
            }

            const totalLaps = Number(raceResult.Results[0]?.laps) || 58;
            const laps = generateLapsFromResults(raceResult.Results, totalLaps, qualifyingGrid);

            // Build driver list from Jolpica results
            const drvs: Driver[] = raceResult.Results.map(r => ({
              id: r.Driver.code ?? r.Driver.driverId.slice(0, 3).toUpperCase(),
              number: Number(r.number),
              name: `${r.Driver.givenName} ${r.Driver.familyName}`,
              team: r.Constructor.name,
              color: teamColor(r.Constructor.name),
              flag: countryCodeToFlag(r.Driver.nationality),
            }));

            setDrivers(drvs);
            setLapData(laps);
            setIsLive(true);
            setDataSource("jolpica");
            setSourceYear(usedYear);
            setLoading(false);
            console.log("[F1TRACK] Jolpica: Loaded! P1:", laps[laps.length - 1]?.order?.[0]);
            return; // SUCCESS — done
          }
        } catch (jolpicaErr: any) {
          console.warn("[F1TRACK] Jolpica fallback failed:", jolpicaErr.message);
        }
      }

      if (cancelled) return;

      // ── Attempt 3: Random simulation (last resort) ────────────────────
      console.warn("[F1TRACK] All APIs failed — using random simulation");
      setError("APIs unavailable — showing simulated data");
      setIsLive(false);
      setDataSource("simulation");
      setSourceYear(null);
      setLapData(generateSimulatedLaps(58));
      setDrivers(FALLBACK_DRIVERS);
      setLoading(false);
    }

    fetchRaceData();
    return () => { cancelled = true; };
  }, [season, countryName, cityHint, round]);

  return { lapData, drivers, loading, error, isLive, dataSource, sourceYear };
}

// ── OpenF1 Sessions List Hook ────────────────────────────────────────────────

export function useSessions(season: number) {
  return useAsync(() => openf1.getSessions(season), [season]);
}

// ── Qualifying Data Hook ─────────────────────────────────────────────────────

export interface QualifyingEntry {
  position: number;
  id: string;
  name: string;
  team: string;
  teamColor: string;
  flag: string;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  eliminated: "Q1" | "Q2" | null;
}

export function useQualifyingData(season: number, round: number) {
  const result = useAsync(async () => {
    if (!round || round <= 0) return null;

    const data = await jolpica.getQualifyingResults(season, round);
    if (!data || data.length === 0) return null;

    const entries: QualifyingEntry[] = data.map(q => {
      const code = q.Driver.code ?? q.Driver.driverId.slice(0, 3).toUpperCase();
      const pos = Number(q.position);
      let eliminated: "Q1" | "Q2" | null = null;
      if (!q.Q2) eliminated = "Q1";
      else if (!q.Q3) eliminated = "Q2";

      return {
        position: pos,
        id: code,
        name: `${q.Driver.givenName} ${q.Driver.familyName}`,
        team: q.Constructor.name,
        teamColor: teamColor(q.Constructor.name),
        flag: countryCodeToFlag(q.Driver.nationality),
        q1: q.Q1 ?? null,
        q2: q.Q2 ?? null,
        q3: q.Q3 ?? null,
        eliminated,
      };
    });

    entries.sort((a, b) => a.position - b.position);
    return entries;
  }, [season, round]);

  return {
    qualifying: result.data ?? null,
    loading: result.loading,
    error: result.error,
  };
}

// ── Practice Data Hook ───────────────────────────────────────────────────────

export interface PracticeEntry {
  position: number;
  id: string;
  name: string;
  team: string;
  teamColor: string;
  flag: string;
  bestLap: number;       // seconds
  bestLapFormatted: string;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  lapCount: number;
  gap: string;           // "+0.469" or "LEADER"
}

export interface PracticeSession {
  name: string;           // "FP1", "FP2", "FP3"
  entries: PracticeEntry[];
}

function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, "0")}`;
}

export function usePracticeData(season: number, countryName: string) {
  const [sessions, setSessions] = useState<PracticeSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryName) return;
    let cancelled = false;

    async function fetchPracticeData() {
      setLoading(true);
      setError(null);

      try {
        // Get all sessions for this country/year
        const allSessions = await openf1.getSessions(season, countryName);
        if (cancelled) return;

        const practiceNames = ["Practice 1", "Practice 2", "Practice 3"];
        const practiceSessions = allSessions.filter(s =>
          practiceNames.includes(s.session_name)
        );

        if (practiceSessions.length === 0) {
          // Try alternate country names
          const variants = [countryName];
          if (countryName === "UK") variants.push("Great Britain", "United Kingdom");
          if (countryName === "USA") variants.push("United States");
          if (countryName === "UAE") variants.push("United Arab Emirates", "Abu Dhabi");

          for (const v of variants.slice(1)) {
            const alt = await openf1.getSessions(season, v);
            const altPractice = alt.filter(s => practiceNames.includes(s.session_name));
            if (altPractice.length > 0) {
              practiceSessions.push(...altPractice);
              break;
            }
          }
        }

        if (practiceSessions.length === 0) throw new Error("No practice sessions found");

        const results: PracticeSession[] = [];

        for (const ps of practiceSessions) {
          if (cancelled) return;

          const [driverData, lapRecords] = await Promise.all([
            openf1.getDrivers(ps.session_key),
            openf1.getLaps(ps.session_key),
          ]);

          const numToDriver: Record<number, { code: string; name: string; team: string; flag: string }> = {};
          driverData.forEach(d => {
            numToDriver[d.driver_number] = {
              code: d.name_acronym,
              name: d.full_name ?? d.broadcast_name,
              team: d.team_name,
              flag: countryCodeToFlag(d.country_code),
            };
          });

          // Find best lap per driver
          const bestLaps: Record<number, typeof lapRecords[0]> = {};
          lapRecords.forEach(l => {
            if (l.lap_duration && l.lap_duration > 30 && l.lap_duration < 200) {
              if (!bestLaps[l.driver_number] || l.lap_duration < bestLaps[l.driver_number].lap_duration!) {
                bestLaps[l.driver_number] = l;
              }
            }
          });

          // Count total laps per driver
          const lapCounts: Record<number, number> = {};
          lapRecords.forEach(l => {
            lapCounts[l.driver_number] = (lapCounts[l.driver_number] ?? 0) + 1;
          });

          const entries: PracticeEntry[] = Object.entries(bestLaps)
            .filter(([num]) => numToDriver[Number(num)])
            .map(([num, lap]) => {
              const dnum = Number(num);
              const d = numToDriver[dnum];
              return {
                position: 0,
                id: d.code,
                name: d.name,
                team: d.team,
                teamColor: teamColor(d.team),
                flag: d.flag,
                bestLap: lap.lap_duration!,
                bestLapFormatted: formatLapTime(lap.lap_duration!),
                sector1: lap.duration_sector_1,
                sector2: lap.duration_sector_2,
                sector3: lap.duration_sector_3,
                lapCount: lapCounts[dnum] ?? 0,
                gap: "",
              };
            })
            .sort((a, b) => a.bestLap - b.bestLap);

          // Assign positions and gaps
          const leaderTime = entries[0]?.bestLap ?? 0;
          entries.forEach((e, i) => {
            e.position = i + 1;
            e.gap = i === 0 ? "LEADER" : `+${(e.bestLap - leaderTime).toFixed(3)}`;
          });

          const shortName = ps.session_name.replace("Practice ", "FP");
          results.push({ name: shortName, entries });
        }

        if (!cancelled) {
          setSessions(results);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn("[F1TRACK] Practice data fetch failed:", err.message);
          setError(err.message);
          setSessions(null);
          setLoading(false);
        }
      }
    }

    fetchPracticeData();
    return () => { cancelled = true; };
  }, [season, countryName]);

  return { sessions, loading, error };
}

// ── Lap Generation from Jolpica Results (correct final order) ────────────────

/**
 * Generate lap-by-lap snapshots from Jolpica race results.
 * Starts with grid order, gradually converges to final classification.
 * This gives a realistic-feeling animation with the CORRECT winner.
 */
function generateLapsFromResults(
  results: import("../api/types").JolpicaResult[],
  totalLaps: number,
  qualifyingGrid?: string[]
): LapSnapshot[] {
  const toCode = (r: import("../api/types").JolpicaResult) =>
    r.Driver.code ?? r.Driver.driverId.slice(0, 3).toUpperCase();

  // Build grid order: prefer qualifying data, then race results grid field
  let gridOrder: string[];
  if (qualifyingGrid && qualifyingGrid.length > 0) {
    gridOrder = [...qualifyingGrid];
  } else {
    const gridSorted = [...results]
      .filter(r => r.grid != null && Number(r.grid) > 0)
      .sort((a, b) => Number(a.grid) - Number(b.grid));
    gridOrder = gridSorted.map(toCode);
  }

  // Build final order (finishing positions)
  const finalSorted = [...results]
    .sort((a, b) => Number(a.position) - Number(b.position));
  const finalOrder = finalSorted.map(toCode);

  // Ensure all drivers are present in grid order
  finalOrder.forEach(code => {
    if (!gridOrder.includes(code)) gridOrder.push(code);
  });

  const laps: LapSnapshot[] = [];
  let currentOrder = [...gridOrder];

  // Pre-compute "milestone" laps where order jumps closer to final
  // This creates distinct phases: start chaos, mid-race settling, final order
  const phase1End = Math.floor(totalLaps * 0.15);  // Lap 1 chaos
  const phase2End = Math.floor(totalLaps * 0.6);   // Mid-race moves

  for (let lap = 0; lap <= totalLaps; lap++) {
    if (lap >= totalLaps - 2) {
      // Final laps: snap to correct finishing order
      currentOrder = [...finalOrder];
    } else if (lap > 0) {
      // Phase 1 (first 15%): big position changes — start chaos, T1 incidents
      // Phase 2 (15-60%): steady convergence — pit stops, strategies
      // Phase 3 (60%+): fine-tuning — late overtakes
      let swapProb: number;
      if (lap <= phase1End) {
        swapProb = 0.6; // Aggressive early swaps (lap 1 chaos)
      } else if (lap <= phase2End) {
        swapProb = 0.3; // Moderate mid-race movement
      } else {
        swapProb = 0.15; // Gentle late adjustments
      }

      // Move drivers that are out of position towards their final spot
      for (let i = 0; i < currentOrder.length - 1; i++) {
        const code = currentOrder[i];
        const finalIdx = finalOrder.indexOf(code);
        if (finalIdx > i && Math.random() < swapProb) {
          [currentOrder[i], currentOrder[i + 1]] = [currentOrder[i + 1], currentOrder[i]];
        }
      }
      for (let i = currentOrder.length - 1; i > 0; i--) {
        const code = currentOrder[i];
        const finalIdx = finalOrder.indexOf(code);
        if (finalIdx < i && Math.random() < swapProb) {
          [currentOrder[i], currentOrder[i - 1]] = [currentOrder[i - 1], currentOrder[i]];
        }
      }
    }

    const gaps: Record<string, number> = {};
    currentOrder.forEach((id, i) => {
      gaps[id] = i === 0 ? 0 : i * 1.24 + Math.random() * 0.5;
    });

    laps.push({
      lap,
      order: [...currentOrder],
      safetycar: false,
      gaps,
    });
  }
  return laps;
}

// ── Simulated Race Data (fallback) ───────────────────────────────────────────

function generateSimulatedLaps(totalLaps: number): LapSnapshot[] {
  const shuffled = FALLBACK_DRIVERS.map(d => d.id).sort(() => Math.random() - 0.5);
  const laps: LapSnapshot[] = [];
  let currentOrder = [...shuffled];
  const scLap1 = Math.floor(totalLaps * 0.35);
  const scLap2 = Math.floor(totalLaps * 0.7);

  for (let lap = 0; lap <= totalLaps; lap++) {
    if (lap > 0) {
      const attempts = Math.random() < 0.4 ? 2 : 1;
      for (let a = 0; a < attempts; a++) {
        if (Math.random() < 0.35) {
          const idx = Math.floor(Math.random() * (currentOrder.length - 1));
          [currentOrder[idx], currentOrder[idx + 1]] = [currentOrder[idx + 1], currentOrder[idx]];
        }
      }
    }
    const gaps: Record<string, number> = {};
    currentOrder.forEach((id, i) => {
      gaps[id] = i === 0 ? 0 : i * 1.24 + Math.random() * 0.5;
    });

    laps.push({
      lap,
      order: [...currentOrder],
      safetycar: lap === scLap1 || lap === scLap2,
      gaps,
    });
  }
  return laps;
}

export { generateSimulatedLaps };
