// ─────────────────────────────────────────────────────────────────────────────
// F1TRACK — API Response Types
// ─────────────────────────────────────────────────────────────────────────────

// ── Jolpica / Ergast API Types ───────────────────────────────────────────────

export interface JolpicaRace {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    url: string;
    circuitName: string;
    Location: {
      lat: string;
      long: string;
      locality: string;
      country: string;
    };
  };
  date: string;        // "2026-03-08"
  time?: string;       // "05:00:00Z"
  FirstPractice?: { date: string; time?: string };
  SecondPractice?: { date: string; time?: string };
  ThirdPractice?: { date: string; time?: string };
  Qualifying?: { date: string; time?: string };
  Sprint?: { date: string; time?: string };
}

export interface JolpicaDriver {
  driverId: string;
  permanentNumber: string;
  code: string;           // "VER", "HAM"
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

export interface JolpicaConstructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

export interface JolpicaResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { millis: string; time: string };
  FastestLap?: {
    rank: string;
    lap: string;
    Time: { time: string };
    AverageSpeed: { units: string; speed: string };
  };
}

export interface JolpicaRaceResult {
  season: string;
  round: string;
  raceName: string;
  Circuit: JolpicaRace["Circuit"];
  date: string;
  Results: JolpicaResult[];
}

export interface JolpicaDriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: JolpicaDriver;
  Constructors: JolpicaConstructor[];
}

export interface JolpicaStandingsList {
  season: string;
  round: string;
  DriverStandings: JolpicaDriverStanding[];
}

export interface JolpicaQualifyingResult {
  position: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  Q1?: string;    // "1:18.932"
  Q2?: string;
  Q3?: string;
}

// ── OpenF1 API Types ─────────────────────────────────────────────────────────

export interface OpenF1Session {
  session_key: number;
  session_name: string;       // "Race", "Qualifying", "Practice 1" etc.
  session_type: string;       // "Race", "Qualifying", "Practice"
  date_start: string;         // ISO timestamp
  date_end: string;
  gmt_offset: string;
  country_name: string;
  country_code: string;
  circuit_key: number;
  circuit_short_name: string;
  meeting_key: number;
  meeting_name?: string;      // e.g. "Miami Grand Prix"
  year: number;
}

export interface OpenF1Driver {
  driver_number: number;
  broadcast_name: string;     // "L NORRIS"
  full_name: string;          // "Lando NORRIS"
  name_acronym: string;       // "NOR"
  team_name: string;
  team_colour: string;        // hex without #, e.g. "FF8000"
  country_code: string;       // "GBR"
  session_key: number;
  headshot_url?: string;
}

export interface OpenF1Position {
  session_key: number;
  driver_number: number;
  position: number;
  date: string;               // ISO timestamp
  meeting_key: number;
}

export interface OpenF1Lap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;        // seconds
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean;
  st_speed: number | null;            // speed trap
  date_start: string;
}

export interface OpenF1Interval {
  session_key: number;
  driver_number: number;
  gap_to_leader: number | null;
  interval: number | null;
  date: string;
}

export interface OpenF1RaceControl {
  session_key: number;
  date: string;
  category: string;           // "SafetyCar", "Flag", "Drs" etc.
  flag?: string;              // "YELLOW", "RED", "GREEN"
  message: string;
  lap_number?: number;
  driver_number?: number;
  scope?: string;             // "Track", "Sector"
}

// ── Internal App Types ───────────────────────────────────────────────────────

export interface Driver {
  id: string;
  number: number;
  name: string;
  team: string;
  color: string;
  flag: string;
}

export interface Race {
  round: number;
  name: string;
  circuit: string;
  circuitId?: string;
  city: string;
  country: string;
  countryCode: string;
  dates: { fri: string; sat: string; sun: string };
  raceDate: Date;
  sprint: boolean;
  status: "completed" | "next" | "upcoming";
}

export interface LapSnapshot {
  lap: number;
  order: string[];          // driver codes in position order
  safetycar: boolean;
  gaps: Record<string, number>;
}

export interface Standing {
  position: number;
  id: string;
  name: string;
  team: string;
  teamColor: string;
  pts: number;
  wins: number;
}

export interface Highlight {
  type: string;
  color: string;
  title: string;
  desc: string;
  time: string;
}
