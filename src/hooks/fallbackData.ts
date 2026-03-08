// ─────────────────────────────────────────────────────────────────────────────
// F1TRACK — Fallback static data (used when APIs are unavailable)
// ─────────────────────────────────────────────────────────────────────────────

import type { Driver, Race, Standing, Highlight } from "../api/types";

export const FALLBACK_DRIVERS: Driver[] = [
  { id: "NOR", number: 4,  name: "Lando Norris",      team: "McLaren",       color: "#FF8000", flag: "🇬🇧" },
  { id: "PIA", number: 81, name: "Oscar Piastri",     team: "McLaren",       color: "#FF8000", flag: "🇦🇺" },
  { id: "VER", number: 1,  name: "Max Verstappen",    team: "Red Bull",      color: "#3671C6", flag: "🇳🇱" },
  { id: "RUS", number: 63, name: "George Russell",    team: "Mercedes",      color: "#27F4D2", flag: "🇬🇧" },
  { id: "HAM", number: 44, name: "Lewis Hamilton",    team: "Ferrari",       color: "#E8002D", flag: "🇬🇧" },
  { id: "LEC", number: 16, name: "Charles Leclerc",   team: "Ferrari",       color: "#E8002D", flag: "🇲🇨" },
  { id: "ANT", number: 12, name: "Kimi Antonelli",    team: "Mercedes",      color: "#27F4D2", flag: "🇮🇹" },
  { id: "ALO", number: 14, name: "Fernando Alonso",   team: "Aston Martin",  color: "#358C75", flag: "🇪🇸" },
  { id: "STR", number: 18, name: "Lance Stroll",      team: "Aston Martin",  color: "#358C75", flag: "🇨🇦" },
  { id: "TSU", number: 22, name: "Yuki Tsunoda",      team: "Red Bull",      color: "#3671C6", flag: "🇯🇵" },
  { id: "HAD", number: 6,  name: "Isack Hadjar",      team: "Racing Bulls",  color: "#6692FF", flag: "🇫🇷" },
  { id: "LAW", number: 30, name: "Liam Lawson",       team: "Racing Bulls",  color: "#6692FF", flag: "🇳🇿" },
  { id: "OCO", number: 31, name: "Esteban Ocon",      team: "Haas",          color: "#B6BABD", flag: "🇫🇷" },
  { id: "BEA", number: 87, name: "Oliver Bearman",    team: "Haas",          color: "#B6BABD", flag: "🇬🇧" },
  { id: "GAS", number: 10, name: "Pierre Gasly",      team: "Alpine",        color: "#FF87BC", flag: "🇫🇷" },
  { id: "COL", number: 43, name: "Franco Colapinto",  team: "Alpine",        color: "#FF87BC", flag: "🇦🇷" },
  { id: "ALB", number: 23, name: "Alex Albon",        team: "Williams",      color: "#64C4FF", flag: "🇹🇭" },
  { id: "SAI", number: 55, name: "Carlos Sainz",      team: "Williams",      color: "#64C4FF", flag: "🇪🇸" },
  { id: "HUL", number: 27, name: "Nico Hulkenberg",   team: "Audi",          color: "#C8B800", flag: "🇩🇪" },
  { id: "BOT", number: 77, name: "Valtteri Bottas",   team: "Audi",          color: "#C8B800", flag: "🇫🇮" },
];

export const FALLBACK_RACES: Race[] = [
  { round: 1,  name: "Australian Grand Prix",    circuit: "Albert Park",         city: "Melbourne",    country: "🇦🇺", countryCode: "Australia",    dates: { fri: "Mar 6",  sat: "Mar 7",  sun: "Mar 8"  }, raceDate: new Date(2026, 2, 8),  sprint: false, status: "completed" },
  { round: 2,  name: "Chinese Grand Prix",       circuit: "Shanghai Int'l",      city: "Shanghai",     country: "🇨🇳", countryCode: "China",        dates: { fri: "Mar 13", sat: "Mar 14", sun: "Mar 15" }, raceDate: new Date(2026, 2, 15), sprint: true,  status: "next" },
  { round: 3,  name: "Japanese Grand Prix",      circuit: "Suzuka",              city: "Suzuka",       country: "🇯🇵", countryCode: "Japan",        dates: { fri: "Mar 27", sat: "Mar 28", sun: "Mar 29" }, raceDate: new Date(2026, 2, 29), sprint: false, status: "upcoming" },
  { round: 4,  name: "Bahrain Grand Prix",       circuit: "Bahrain Int'l",       city: "Sakhir",       country: "🇧🇭", countryCode: "Bahrain",      dates: { fri: "Apr 10", sat: "Apr 11", sun: "Apr 12" }, raceDate: new Date(2026, 3, 12), sprint: false, status: "upcoming" },
  { round: 5,  name: "Saudi Arabian Grand Prix", circuit: "Jeddah Corniche",     city: "Jeddah",       country: "🇸🇦", countryCode: "Saudi Arabia", dates: { fri: "Apr 17", sat: "Apr 18", sun: "Apr 19" }, raceDate: new Date(2026, 3, 19), sprint: false, status: "upcoming" },
  { round: 6,  name: "Miami Grand Prix",         circuit: "Miami Int'l",         city: "Miami",        country: "🇺🇸", countryCode: "USA",          dates: { fri: "May 1",  sat: "May 2",  sun: "May 3"  }, raceDate: new Date(2026, 4, 3),  sprint: true,  status: "upcoming" },
  { round: 7,  name: "Canadian Grand Prix",      circuit: "Circuit Gilles V.",   city: "Montréal",     country: "🇨🇦", countryCode: "Canada",       dates: { fri: "May 22", sat: "May 23", sun: "May 24" }, raceDate: new Date(2026, 4, 24), sprint: true,  status: "upcoming" },
  { round: 8,  name: "Monaco Grand Prix",        circuit: "Circuit de Monaco",   city: "Monaco",       country: "🇲🇨", countryCode: "Monaco",       dates: { fri: "Jun 5",  sat: "Jun 6",  sun: "Jun 7"  }, raceDate: new Date(2026, 5, 7),  sprint: false, status: "upcoming" },
  { round: 9,  name: "Spanish Grand Prix",       circuit: "Circuit de Cataluña", city: "Barcelona",    country: "🇪🇸", countryCode: "Spain",        dates: { fri: "Jun 12", sat: "Jun 13", sun: "Jun 14" }, raceDate: new Date(2026, 5, 14), sprint: false, status: "upcoming" },
  { round: 10, name: "Austrian Grand Prix",      circuit: "Red Bull Ring",       city: "Spielberg",    country: "🇦🇹", countryCode: "Austria",      dates: { fri: "Jun 26", sat: "Jun 27", sun: "Jun 28" }, raceDate: new Date(2026, 5, 28), sprint: false, status: "upcoming" },
  { round: 11, name: "British Grand Prix",       circuit: "Silverstone",         city: "Silverstone",  country: "🇬🇧", countryCode: "UK",           dates: { fri: "Jul 3",  sat: "Jul 4",  sun: "Jul 5"  }, raceDate: new Date(2026, 6, 5),  sprint: true,  status: "upcoming" },
  { round: 12, name: "Belgian Grand Prix",       circuit: "Spa-Francorchamps",   city: "Spa",          country: "🇧🇪", countryCode: "Belgium",      dates: { fri: "Jul 17", sat: "Jul 18", sun: "Jul 19" }, raceDate: new Date(2026, 6, 19), sprint: false, status: "upcoming" },
  { round: 13, name: "Hungarian Grand Prix",     circuit: "Hungaroring",         city: "Budapest",     country: "🇭🇺", countryCode: "Hungary",      dates: { fri: "Jul 24", sat: "Jul 25", sun: "Jul 26" }, raceDate: new Date(2026, 6, 26), sprint: false, status: "upcoming" },
  { round: 14, name: "Dutch Grand Prix",         circuit: "Zandvoort",           city: "Zandvoort",    country: "🇳🇱", countryCode: "Netherlands",  dates: { fri: "Aug 21", sat: "Aug 22", sun: "Aug 23" }, raceDate: new Date(2026, 7, 23), sprint: true,  status: "upcoming" },
  { round: 15, name: "Italian Grand Prix",       circuit: "Monza",               city: "Monza",        country: "🇮🇹", countryCode: "Italy",        dates: { fri: "Sep 4",  sat: "Sep 5",  sun: "Sep 6"  }, raceDate: new Date(2026, 8, 6),  sprint: false, status: "upcoming" },
  { round: 16, name: "Madrid Grand Prix",        circuit: "Circuito de Madrid",  city: "Madrid",       country: "🇪🇸", countryCode: "Spain",        dates: { fri: "Sep 11", sat: "Sep 12", sun: "Sep 13" }, raceDate: new Date(2026, 8, 13), sprint: false, status: "upcoming" },
  { round: 17, name: "Azerbaijan Grand Prix",    circuit: "Baku City Circuit",   city: "Baku",         country: "🇦🇿", countryCode: "Azerbaijan",   dates: { fri: "Sep 25", sat: "Sep 26", sun: ""        }, raceDate: new Date(2026, 8, 27), sprint: false, status: "upcoming" },
  { round: 18, name: "Singapore Grand Prix",     circuit: "Marina Bay",          city: "Singapore",    country: "🇸🇬", countryCode: "Singapore",    dates: { fri: "Oct 9",  sat: "Oct 10", sun: "Oct 11" }, raceDate: new Date(2026, 9, 11), sprint: true,  status: "upcoming" },
  { round: 19, name: "United States Grand Prix", circuit: "COTA",                city: "Austin",       country: "🇺🇸", countryCode: "USA",          dates: { fri: "Oct 23", sat: "Oct 24", sun: "Oct 25" }, raceDate: new Date(2026, 9, 25), sprint: false, status: "upcoming" },
  { round: 20, name: "Mexico City Grand Prix",   circuit: "Autodromo H.",        city: "Mexico City",  country: "🇲🇽", countryCode: "Mexico",       dates: { fri: "Oct 30", sat: "Oct 31", sun: "Nov 1"  }, raceDate: new Date(2026, 10,1),  sprint: false, status: "upcoming" },
  { round: 21, name: "São Paulo Grand Prix",     circuit: "Interlagos",          city: "São Paulo",    country: "🇧🇷", countryCode: "Brazil",       dates: { fri: "Nov 6",  sat: "Nov 7",  sun: "Nov 8"  }, raceDate: new Date(2026, 10,8),  sprint: false, status: "upcoming" },
  { round: 22, name: "Las Vegas Grand Prix",     circuit: "Las Vegas Strip",     city: "Las Vegas",    country: "🇺🇸", countryCode: "USA",          dates: { fri: "Nov 20", sat: "Nov 21", sun: ""        }, raceDate: new Date(2026, 10,22), sprint: false, status: "upcoming" },
  { round: 23, name: "Qatar Grand Prix",         circuit: "Lusail Int'l",        city: "Lusail",       country: "🇶🇦", countryCode: "Qatar",        dates: { fri: "Nov 27", sat: "Nov 28", sun: "Nov 29" }, raceDate: new Date(2026, 10,29), sprint: false, status: "upcoming" },
  { round: 24, name: "Abu Dhabi Grand Prix",     circuit: "Yas Marina",          city: "Abu Dhabi",    country: "🇦🇪", countryCode: "UAE",          dates: { fri: "Dec 4",  sat: "Dec 5",  sun: "Dec 6"  }, raceDate: new Date(2026, 11,6),  sprint: false, status: "upcoming" },
];

export const FALLBACK_STANDINGS: Standing[] = [
  { position: 1,  id: "NOR", name: "Lando Norris",    team: "McLaren",      teamColor: "#FF8000", pts: 25, wins: 1 },
  { position: 2,  id: "VER", name: "Max Verstappen",  team: "Red Bull",     teamColor: "#3671C6", pts: 18, wins: 0 },
  { position: 3,  id: "RUS", name: "George Russell",  team: "Mercedes",     teamColor: "#27F4D2", pts: 15, wins: 0 },
  { position: 4,  id: "PIA", name: "Oscar Piastri",   team: "McLaren",      teamColor: "#FF8000", pts: 12, wins: 0 },
  { position: 5,  id: "HAM", name: "Lewis Hamilton",  team: "Ferrari",      teamColor: "#E8002D", pts: 10, wins: 0 },
  { position: 6,  id: "LEC", name: "Charles Leclerc", team: "Ferrari",      teamColor: "#E8002D", pts: 8,  wins: 0 },
  { position: 7,  id: "ANT", name: "Kimi Antonelli",  team: "Mercedes",     teamColor: "#27F4D2", pts: 6,  wins: 0 },
  { position: 8,  id: "ALO", name: "Fernando Alonso", team: "Aston Martin", teamColor: "#358C75", pts: 4,  wins: 0 },
  { position: 9,  id: "TSU", name: "Yuki Tsunoda",    team: "Red Bull",     teamColor: "#3671C6", pts: 2,  wins: 0 },
  { position: 10, id: "HAD", name: "Isack Hadjar",    team: "Racing Bulls", teamColor: "#6692FF", pts: 1,  wins: 0 },
  { position: 11, id: "COL", name: "Franco Colapinto", team: "Alpine",      teamColor: "#FF87BC", pts: 0,  wins: 0 },
  { position: 12, id: "BEA", name: "Oliver Bearman",  team: "Haas",         teamColor: "#B6BABD", pts: 0,  wins: 0 },
  { position: 13, id: "GAS", name: "Pierre Gasly",    team: "Alpine",       teamColor: "#FF87BC", pts: 0,  wins: 0 },
  { position: 14, id: "SAI", name: "Carlos Sainz",    team: "Williams",     teamColor: "#64C4FF", pts: 0,  wins: 0 },
  { position: 15, id: "STR", name: "Lance Stroll",    team: "Aston Martin", teamColor: "#358C75", pts: 0,  wins: 0 },
  { position: 16, id: "ALB", name: "Alex Albon",      team: "Williams",     teamColor: "#64C4FF", pts: 0,  wins: 0 },
  { position: 17, id: "LAW", name: "Liam Lawson",     team: "Racing Bulls", teamColor: "#6692FF", pts: 0,  wins: 0 },
  { position: 18, id: "OCO", name: "Esteban Ocon",    team: "Haas",         teamColor: "#B6BABD", pts: 0,  wins: 0 },
  { position: 19, id: "HUL", name: "Nico Hulkenberg", team: "Audi",         teamColor: "#C8B800", pts: 0,  wins: 0 },
  { position: 20, id: "BOT", name: "Valtteri Bottas", team: "Audi",         teamColor: "#C8B800", pts: 0,  wins: 0 },
];

export const FALLBACK_HIGHLIGHTS: Record<"fri" | "sat", Highlight[]> = {
  fri: [
    { type: "FP1",      color: "#27F4D2", title: "Norris sets early pace",          desc: "Lando Norris topped FP1 with a 1:21.432 on medium tyres, 0.2s ahead of Verstappen.",                              time: "FP1 — Lap 8" },
    { type: "FP1",      color: "#27F4D2", title: "Red Bull tests new floor",        desc: "Verstappen ran experimental floor updates throughout FP1. Initial data looks promising with improved low-speed turn-in.", time: "FP1 — Lap 15" },
    { type: "FP2",      color: "#64C4FF", title: "Ferrari struggles on long runs",  desc: "Both Hamilton and Leclerc showed concerning pace on high-fuel runs, 1.2s off McLaren's benchmark time.",            time: "FP2 — Lap 22" },
    { type: "FP2",      color: "#64C4FF", title: "Piastri fastest in race sims",    desc: "Oscar Piastri's long run average of 1:23.6 was the fastest of anyone in the session, suggesting strong race pace.", time: "FP2 — Lap 28" },
    { type: "INCIDENT", color: "#ffd700", title: "Antonelli spins at Turn 9",       desc: "The rookie Mercedes driver lost the rear under braking and spun into the gravel. No damage, but red flags briefly.", time: "FP2 — Lap 31" },
    { type: "TRACK",    color: "#FF87BC", title: "Track evolution significant",      desc: "Grip levels improved by 1.8s from FP1 to FP2 as the new surface continued to rubber in throughout the day.",       time: "FP2 — End" },
  ],
  sat: [
    { type: "Q1",   color: "#FF8000", title: "Albon eliminated in Q1",   desc: "Williams driver Alex Albon missed the cut to Q2 after a yellow flag ruined his final lap. Hulkenberg also knocked out.",     time: "Q1 — Final" },
    { type: "Q1",   color: "#FF8000", title: "Colapinto shines in Q1",   desc: "Franco Colapinto made it into Q2 in only his second race weekend with Alpine, setting P13 in Q1.",                           time: "Q1 — Final" },
    { type: "Q2",   color: "#6692FF", title: "Russell leads Q2",         desc: "George Russell set a stunning 1:19.882 to top Q2, with both Red Bulls in P4 and P5.",                                       time: "Q2 — Final" },
    { type: "Q2",   color: "#6692FF", title: "Both Ferraris through",    desc: "Hamilton and Leclerc progressed but looked under pressure — Hamilton scraped through in P9.",                                 time: "Q2 — Final" },
    { type: "POLE", color: "#e10600", title: "POLE POSITION: Norris P1", desc: "Lando Norris storms to pole position with a 1:18.441, narrowly edging Piastri by 0.087s. McLaren lock out the front row.",  time: "Q3 — Final" },
    { type: "Q3",   color: "#e10600", title: "Top 5 covered by 0.25s",   desc: "Norris, Piastri, Russell, Verstappen and Leclerc all within a quarter of a second — the closest top-5 qualifying of the year.", time: "Q3 — Final" },
  ],
};
