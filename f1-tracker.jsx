import { useState, useEffect, useRef } from "react";

// ── DATA ─────────────────────────────────────────────────────────────────────

const DRIVERS = [
  { id: "NOR", name: "Lando Norris",      team: "McLaren",       teamId: "mclaren",       color: "#FF8000", flag: "🇬🇧", number: 4,  nationality: "British",    age: 25, podiums: 18, poles: 5  },
  { id: "PIA", name: "Oscar Piastri",     team: "McLaren",       teamId: "mclaren",       color: "#FF8000", flag: "🇦🇺", number: 81, nationality: "Australian", age: 24, podiums: 9,  poles: 1  },
  { id: "VER", name: "Max Verstappen",    team: "Red Bull",      teamId: "redbull",       color: "#3671C6", flag: "🇳🇱", number: 1,  nationality: "Dutch",      age: 27, podiums: 107,poles: 40 },
  { id: "RUS", name: "George Russell",    team: "Mercedes",      teamId: "mercedes",      color: "#27F4D2", flag: "🇬🇧", number: 63, nationality: "British",    age: 27, podiums: 14, poles: 3  },
  { id: "HAM", name: "Lewis Hamilton",    team: "Ferrari",       teamId: "ferrari",       color: "#E8002D", flag: "🇬🇧", number: 44, nationality: "British",    age: 41, podiums: 197,poles: 104},
  { id: "LEC", name: "Charles Leclerc",   team: "Ferrari",       teamId: "ferrari",       color: "#E8002D", flag: "🇲🇨", number: 16, nationality: "Monégasque", age: 28, podiums: 40, poles: 24 },
  { id: "ANT", name: "Kimi Antonelli",    team: "Mercedes",      teamId: "mercedes",      color: "#27F4D2", flag: "🇮🇹", number: 12, nationality: "Italian",    age: 19, podiums: 0,  poles: 0  },
  { id: "ALO", name: "Fernando Alonso",   team: "Aston Martin",  teamId: "astonmartin",   color: "#358C75", flag: "🇪🇸", number: 14, nationality: "Spanish",    age: 44, podiums: 106,poles: 22 },
  { id: "STR", name: "Lance Stroll",      team: "Aston Martin",  teamId: "astonmartin",   color: "#358C75", flag: "🇨🇦", number: 18, nationality: "Canadian",   age: 27, podiums: 3,  poles: 1  },
  { id: "TSU", name: "Yuki Tsunoda",      team: "Red Bull",      teamId: "redbull",       color: "#3671C6", flag: "🇯🇵", number: 22, nationality: "Japanese",   age: 25, podiums: 0,  poles: 0  },
  { id: "HAD", name: "Isack Hadjar",      team: "Racing Bulls",  teamId: "racingbulls",   color: "#6692FF", flag: "🇫🇷", number: 6,  nationality: "French",     age: 20, podiums: 0,  poles: 0  },
  { id: "LAW", name: "Liam Lawson",       team: "Racing Bulls",  teamId: "racingbulls",   color: "#6692FF", flag: "🇳🇿", number: 30, nationality: "New Zealander",age:23, podiums: 0, poles: 0  },
  { id: "OCO", name: "Esteban Ocon",      team: "Haas",          teamId: "haas",          color: "#B6BABD", flag: "🇫🇷", number: 31, nationality: "French",     age: 29, podiums: 3,  poles: 0  },
  { id: "BEA", name: "Oliver Bearman",    team: "Haas",          teamId: "haas",          color: "#B6BABD", flag: "🇬🇧", number: 87, nationality: "British",    age: 20, podiums: 0,  poles: 0  },
  { id: "GAS", name: "Pierre Gasly",      team: "Alpine",        teamId: "alpine",        color: "#FF87BC", flag: "🇫🇷", number: 10, nationality: "French",     age: 29, podiums: 4,  poles: 1  },
  { id: "COL", name: "Franco Colapinto",  team: "Alpine",        teamId: "alpine",        color: "#FF87BC", flag: "🇦🇷", number: 43, nationality: "Argentine",  age: 22, podiums: 0,  poles: 0  },
  { id: "ALB", name: "Alex Albon",        team: "Williams",      teamId: "williams",      color: "#64C4FF", flag: "🇹🇭", number: 23, nationality: "Thai",       age: 29, podiums: 2,  poles: 0  },
  { id: "SAI", name: "Carlos Sainz",      team: "Williams",      teamId: "williams",      color: "#64C4FF", flag: "🇪🇸", number: 55, nationality: "Spanish",    age: 31, podiums: 24, poles: 5  },
  { id: "HUL", name: "Nico Hulkenberg",   team: "Audi",          teamId: "audi",          color: "#C8B800", flag: "🇩🇪", number: 27, nationality: "German",     age: 38, podiums: 0,  poles: 1  },
  { id: "BOT", name: "Valtteri Bottas",   team: "Audi",          teamId: "audi",          color: "#C8B800", flag: "🇫🇮", number: 77, nationality: "Finnish",    age: 36, podiums: 67, poles: 20 },
];

const TEAMS = [
  { id: "mclaren",    name: "McLaren",          shortName: "MCL", color: "#FF8000", color2: "#e06a00", base: "Woking, UK",           championships: 8,  founded: 1963, chassis: "MCL40",   engine: "Mercedes" },
  { id: "redbull",    name: "Red Bull Racing",  shortName: "RBR", color: "#3671C6", color2: "#1e45a0", base: "Milton Keynes, UK",     championships: 6,  founded: 2005, chassis: "RB21",    engine: "Honda RBPT" },
  { id: "mercedes",   name: "Mercedes",         shortName: "MER", color: "#27F4D2", color2: "#00c4a7", base: "Brackley, UK",          championships: 8,  founded: 1954, chassis: "W16",     engine: "Mercedes" },
  { id: "ferrari",    name: "Scuderia Ferrari", shortName: "FER", color: "#E8002D", color2: "#aa0020", base: "Maranello, Italy",      championships: 16, founded: 1950, chassis: "SF-26",   engine: "Ferrari" },
  { id: "astonmartin",name: "Aston Martin",     shortName: "AMR", color: "#358C75", color2: "#1d6b55", base: "Silverstone, UK",       championships: 0,  founded: 2021, chassis: "AMR26",   engine: "Mercedes" },
  { id: "racingbulls",name: "Racing Bulls",     shortName: "RCB", color: "#6692FF", color2: "#3355cc", base: "Faenza, Italy",         championships: 0,  founded: 2006, chassis: "VCARB02", engine: "Honda RBPT" },
  { id: "haas",       name: "Haas F1 Team",     shortName: "HAS", color: "#B6BABD", color2: "#888c8f", base: "Kannapolis, USA",       championships: 0,  founded: 2016, chassis: "VF-26",   engine: "Ferrari" },
  { id: "alpine",     name: "Alpine",           shortName: "ALP", color: "#FF87BC", color2: "#cc5090", base: "Enstone, UK",           championships: 0,  founded: 2021, chassis: "A526",    engine: "Renault" },
  { id: "williams",   name: "Williams",         shortName: "WIL", color: "#64C4FF", color2: "#2288cc", base: "Grove, UK",             championships: 9,  founded: 1977, chassis: "FW47",    engine: "Mercedes" },
  { id: "audi",       name: "Audi F1",          shortName: "AUD", color: "#C8B800", color2: "#998900", base: "Neckarsulm, Germany",   championships: 0,  founded: 2026, chassis: "C45e",    engine: "Audi" },
];

const RACES_2026 = [
  { round: 1,  name: "Australian GP",       circuit: "Albert Park",         city: "Melbourne",    country: "🇦🇺", dates: { fri: "Mar 6",  sat: "Mar 7",  sun: "Mar 8"  }, month: 3,  day: 6,  sprint: false, status: "completed" },
  { round: 2,  name: "Chinese GP",          circuit: "Shanghai Int'l",      city: "Shanghai",     country: "🇨🇳", dates: { fri: "Mar 13", sat: "Mar 14", sun: "Mar 15" }, month: 3,  day: 13, sprint: true,  status: "next"      },
  { round: 3,  name: "Japanese GP",         circuit: "Suzuka",              city: "Suzuka",       country: "🇯🇵", dates: { fri: "Mar 27", sat: "Mar 28", sun: "Mar 29" }, month: 3,  day: 27, sprint: false, status: "upcoming"  },
  { round: 4,  name: "Bahrain GP",          circuit: "Bahrain Int'l",       city: "Sakhir",       country: "🇧🇭", dates: { fri: "Apr 10", sat: "Apr 11", sun: "Apr 12" }, month: 4,  day: 10, sprint: false, status: "upcoming"  },
  { round: 5,  name: "Saudi Arabian GP",    circuit: "Jeddah Corniche",     city: "Jeddah",       country: "🇸🇦", dates: { fri: "Apr 17", sat: "Apr 18", sun: "Apr 19" }, month: 4,  day: 17, sprint: false, status: "upcoming"  },
  { round: 6,  name: "Miami GP",            circuit: "Miami Int'l",         city: "Miami",        country: "🇺🇸", dates: { fri: "May 1",  sat: "May 2",  sun: "May 3"  }, month: 5,  day: 1,  sprint: true,  status: "upcoming"  },
  { round: 7,  name: "Canadian GP",         circuit: "Circuit Gilles V.",   city: "Montréal",     country: "🇨🇦", dates: { fri: "May 22", sat: "May 23", sun: "May 24" }, month: 5,  day: 22, sprint: true,  status: "upcoming"  },
  { round: 8,  name: "Monaco GP",           circuit: "Circuit de Monaco",   city: "Monaco",       country: "🇲🇨", dates: { fri: "Jun 5",  sat: "Jun 6",  sun: "Jun 7"  }, month: 6,  day: 5,  sprint: false, status: "upcoming"  },
  { round: 9,  name: "Barcelona GP",        circuit: "Circuit de Cataluña", city: "Barcelona",    country: "🇪🇸", dates: { fri: "Jun 12", sat: "Jun 13", sun: "Jun 14" }, month: 6,  day: 12, sprint: false, status: "upcoming"  },
  { round: 10, name: "Austrian GP",         circuit: "Red Bull Ring",       city: "Spielberg",    country: "🇦🇹", dates: { fri: "Jun 26", sat: "Jun 27", sun: "Jun 28" }, month: 6,  day: 26, sprint: false, status: "upcoming"  },
  { round: 11, name: "British GP",          circuit: "Silverstone",         city: "Silverstone",  country: "🇬🇧", dates: { fri: "Jul 3",  sat: "Jul 4",  sun: "Jul 5"  }, month: 7,  day: 3,  sprint: true,  status: "upcoming"  },
  { round: 12, name: "Belgian GP",          circuit: "Spa-Francorchamps",   city: "Spa",          country: "🇧🇪", dates: { fri: "Jul 17", sat: "Jul 18", sun: "Jul 19" }, month: 7,  day: 17, sprint: false, status: "upcoming"  },
  { round: 13, name: "Hungarian GP",        circuit: "Hungaroring",         city: "Budapest",     country: "🇭🇺", dates: { fri: "Jul 24", sat: "Jul 25", sun: "Jul 26" }, month: 7,  day: 24, sprint: false, status: "upcoming"  },
  { round: 14, name: "Dutch GP",            circuit: "Zandvoort",           city: "Zandvoort",    country: "🇳🇱", dates: { fri: "Aug 21", sat: "Aug 22", sun: "Aug 23" }, month: 8,  day: 21, sprint: true,  status: "upcoming"  },
  { round: 15, name: "Italian GP",          circuit: "Monza",               city: "Monza",        country: "🇮🇹", dates: { fri: "Sep 4",  sat: "Sep 5",  sun: "Sep 6"  }, month: 9,  day: 4,  sprint: false, status: "upcoming"  },
  { round: 16, name: "Madrid GP",           circuit: "Circuito de Madrid",  city: "Madrid",       country: "🇪🇸", dates: { fri: "Sep 11", sat: "Sep 12", sun: "Sep 13" }, month: 9,  day: 11, sprint: false, status: "upcoming"  },
  { round: 17, name: "Azerbaijan GP",       circuit: "Baku City Circuit",   city: "Baku",         country: "🇦🇿", dates: { fri: "Sep 25", sat: "Sep 26", sun: ""        }, month: 9,  day: 25, sprint: false, status: "upcoming"  },
  { round: 18, name: "Singapore GP",        circuit: "Marina Bay",          city: "Singapore",    country: "🇸🇬", dates: { fri: "Oct 9",  sat: "Oct 10", sun: "Oct 11" }, month: 10, day: 9,  sprint: true,  status: "upcoming"  },
  { round: 19, name: "United States GP",    circuit: "COTA",                city: "Austin",       country: "🇺🇸", dates: { fri: "Oct 23", sat: "Oct 24", sun: "Oct 25" }, month: 10, day: 23, sprint: false, status: "upcoming"  },
  { round: 20, name: "Mexico City GP",      circuit: "Autodromo H.",        city: "Mexico City",  country: "🇲🇽", dates: { fri: "Oct 30", sat: "Oct 31", sun: "Nov 1"  }, month: 10, day: 30, sprint: false, status: "upcoming"  },
  { round: 21, name: "São Paulo GP",        circuit: "Interlagos",          city: "São Paulo",    country: "🇧🇷", dates: { fri: "Nov 6",  sat: "Nov 7",  sun: "Nov 8"  }, month: 11, day: 6,  sprint: false, status: "upcoming"  },
  { round: 22, name: "Las Vegas GP",        circuit: "Las Vegas Strip",     city: "Las Vegas",    country: "🇺🇸", dates: { fri: "Nov 20", sat: "Nov 21", sun: ""        }, month: 11, day: 20, sprint: false, status: "upcoming"  },
  { round: 23, name: "Qatar GP",            circuit: "Lusail Int'l",        city: "Lusail",       country: "🇶🇦", dates: { fri: "Nov 27", sat: "Nov 28", sun: "Nov 29" }, month: 11, day: 27, sprint: false, status: "upcoming"  },
  { round: 24, name: "Abu Dhabi GP",        circuit: "Yas Marina",          city: "Abu Dhabi",    country: "🇦🇪", dates: { fri: "Dec 4",  sat: "Dec 5",  sun: "Dec 6"  }, month: 12, day: 4,  sprint: false, status: "upcoming"  },
];

// ── RACE SIMULATION ──────────────────────────────────────────────────────────
function generateRaceLaps(totalLaps = 57) {
  const startGrid = [...DRIVERS].map(d => d.id);
  const shuffled  = [...startGrid].sort(() => Math.random() - 0.5);
  const laps = [];
  let currentOrder = [...shuffled];
  for (let lap = 0; lap <= totalLaps; lap++) {
    if (lap > 0 && lap % Math.floor(Math.random() * 4 + 2) === 0) {
      const idx = Math.floor(Math.random() * (currentOrder.length - 1));
      [currentOrder[idx], currentOrder[idx + 1]] = [currentOrder[idx + 1], currentOrder[idx]];
    }
    laps.push({ lap, order: [...currentOrder], safetycar: lap === Math.floor(totalLaps * 0.35) || lap === Math.floor(totalLaps * 0.7), drs: lap > 2 });
  }
  return laps;
}
const AUS_LAPS   = generateRaceLaps(58);
const AUS_RESULT = ["NOR","VER","RUS","PIA","HAM","LEC","ANT","ALO","TSU","HAD","COL","BEA","GAS","SAI","STR","ALB","LAW","OCO","HUL","BOT"];

const STANDINGS = [
  { id: "NOR", pts: 25 }, { id: "VER", pts: 18 }, { id: "RUS", pts: 15 },
  { id: "PIA", pts: 12 }, { id: "HAM", pts: 10 }, { id: "LEC", pts: 8  },
  { id: "ANT", pts: 6  }, { id: "ALO", pts: 4  }, { id: "TSU", pts: 2  },
  { id: "HAD", pts: 1  }, { id: "COL", pts: 0  }, { id: "BEA", pts: 0  },
  { id: "GAS", pts: 0  }, { id: "SAI", pts: 0  }, { id: "STR", pts: 0  },
  { id: "ALB", pts: 0  }, { id: "LAW", pts: 0  }, { id: "OCO", pts: 0  },
  { id: "HUL", pts: 0  }, { id: "BOT", pts: 0  },
];

const CONSTRUCTOR_STANDINGS = [
  { id: "mclaren",    pts: 37 },
  { id: "mercedes",   pts: 21 },
  { id: "redbull",    pts: 20 },
  { id: "ferrari",    pts: 18 },
  { id: "astonmartin",pts: 4  },
  { id: "racingbulls",pts: 3  },
  { id: "haas",       pts: 0  },
  { id: "alpine",     pts: 0  },
  { id: "williams",   pts: 0  },
  { id: "audi",       pts: 0  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const getDriver = id => DRIVERS.find(d => d.id === id) || DRIVERS[0];
const getTeam   = id => TEAMS.find(t => t.id === id)   || TEAMS[0];
function driverInitials(name) {
  const p = name.split(" ");
  return (p[0][0] + (p[p.length - 1][0] || "")).toUpperCase();
}
function daysUntil(month, day) {
  const now  = new Date(2026, 2, 8);
  const race = new Date(2026, month - 1, day);
  return Math.ceil((race - now) / (1000 * 60 * 60 * 24));
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #060608;
    --surface:  #0d0e14;
    --surface2: #13141d;
    --surface3: #1a1b26;
    --border:   rgba(255,255,255,0.07);
    --border2:  rgba(255,255,255,0.12);
    --red:      #e10600;
    --red-glow: rgba(225,6,0,0.35);
    --gold:     #ffd700;
    --silver:   #c0c0c0;
    --bronze:   #cd7f32;
    --text:     #e8e8f0;
    --muted:    #5a5a72;
    --muted2:   #7a7a96;
    --accent:   #ff6b35;
    --green:    #00e676;
    --up:       #00e676;
    --down:     #ff5252;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Barlow', sans-serif; overflow-x: hidden; }

  /* ── KEYFRAMES ─────────────────────────────────────────────────────────── */
  @keyframes pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.4; transform: scale(0.7); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes progressFill {
    from { width: 0; }
    to   { width: var(--bar-w); }
  }
  @keyframes overtakeFlash {
    0%   { background: rgba(0,230,118,0.18); box-shadow: inset 0 0 20px rgba(0,230,118,0.08); }
    100% { background: transparent; box-shadow: none; }
  }
  @keyframes dropFlash {
    0%   { background: rgba(255,82,82,0.18); box-shadow: inset 0 0 20px rgba(255,82,82,0.08); }
    100% { background: transparent; box-shadow: none; }
  }
  @keyframes scFlash {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes glowPulse {
    0%,100% { box-shadow: 0 0 12px rgba(255,215,0,0.25); }
    50%     { box-shadow: 0 0 28px rgba(255,215,0,0.55); }
  }
  @keyframes borderGlow {
    0%,100% { border-color: rgba(225,6,0,0.4); }
    50%     { border-color: rgba(225,6,0,0.8); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lapTick {
    0%   { transform: scale(1.18); color: #fff; }
    100% { transform: scale(1); color: var(--text); }
  }

  /* ── APP SHELL ─────────────────────────────────────────────────────────── */
  .f1-app {
    min-height: 100vh;
    background: var(--bg);
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(225,6,0,0.07) 0%, transparent 60%),
      repeating-linear-gradient(0deg,  transparent, transparent 39px, rgba(255,255,255,0.012) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.012) 40px);
  }

  /* ── NAV ────────────────────────────────────────────────────────────────── */
  .nav {
    position: sticky; top: 0; z-index: 200;
    background: rgba(6,6,8,0.94);
    backdrop-filter: blur(24px);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    padding: 0 28px;
    height: 58px;
  }
  .nav-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 22px; letter-spacing: 4px;
    color: var(--red); margin-right: 36px;
    text-transform: uppercase; flex-shrink: 0;
    text-shadow: 0 0 20px rgba(225,6,0,0.5);
  }
  .nav-logo span { color: var(--text); }
  .nav-tabs { display: flex; gap: 0; flex: 1; overflow-x: auto; }
  .nav-tabs::-webkit-scrollbar { display: none; }
  .nav-tab {
    padding: 0 18px; height: 58px;
    background: none; border: none;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px; letter-spacing: 1.8px;
    text-transform: uppercase; cursor: pointer;
    transition: color 0.2s;
    border-bottom: 3px solid transparent;
    white-space: nowrap;
    display: flex; align-items: center; gap: 6px;
  }
  .nav-tab:hover { color: var(--muted2); }
  .nav-tab.active { color: var(--text); border-bottom-color: var(--red); }
  .live-dot {
    display: inline-block; width: 7px; height: 7px;
    background: var(--red); border-radius: 50%;
    box-shadow: 0 0 8px var(--red);
    animation: pulse 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }

  /* ── PAGE WRAPPER ───────────────────────────────────────────────────────── */
  .page {
    padding: 36px 32px;
    max-width: 1440px;
    margin: 0 auto;
    animation: fadeInUp 0.35s ease both;
  }
  .page-header { margin-bottom: 32px; }
  .page-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 52px; letter-spacing: 2px;
    text-transform: uppercase; line-height: 1;
    color: var(--text);
  }
  .page-title span { color: var(--red); }
  .page-sub {
    color: var(--muted); font-size: 12px; letter-spacing: 2px;
    text-transform: uppercase; margin-top: 6px;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 600;
  }

  /* ── SECTION TABS ───────────────────────────────────────────────────────── */
  .section-tabs { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; }
  .section-tab {
    padding: 8px 18px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 3px; color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 12px; letter-spacing: 1.5px;
    text-transform: uppercase; cursor: pointer;
    transition: all 0.2s; white-space: nowrap;
  }
  .section-tab:hover { color: var(--text); border-color: var(--border2); }
  .section-tab.active { background: var(--red); color: #fff; border-color: var(--red); box-shadow: 0 4px 16px rgba(225,6,0,0.3); }

  /* ── CALENDAR ───────────────────────────────────────────────────────────── */
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
    gap: 14px;
  }
  .race-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 20px 22px;
    cursor: pointer;
    transition: border-color 0.2s, transform 0.18s, box-shadow 0.2s;
    position: relative; overflow: hidden;
    animation: fadeInUp 0.4s ease both;
  }
  .race-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: transparent; transition: background 0.2s;
  }
  .race-card:hover {
    border-color: var(--border2);
    transform: translateY(-3px);
    box-shadow: 0 10px 36px rgba(0,0,0,0.5);
  }
  .race-card:hover::before { background: var(--red); }
  .race-card.completed { opacity: 0.75; }
  .race-card.completed::before { background: var(--muted); }
  .race-card.next { border-color: rgba(225,6,0,0.45); animation: borderGlow 2.5s ease infinite; }
  .race-card.next::before { background: var(--red); }

  .card-round {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    color: var(--muted); text-transform: uppercase;
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .sprint-badge {
    background: rgba(255,107,53,0.15); color: var(--accent);
    font-size: 9px; letter-spacing: 1.5px; padding: 2px 7px;
    border-radius: 2px; border: 1px solid rgba(255,107,53,0.35);
  }
  .card-flag { font-size: 22px; margin-bottom: 6px; display: block; }
  .card-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 23px; letter-spacing: 0.5px;
    color: var(--text); margin-bottom: 2px; line-height: 1.1;
  }
  .card-circuit { color: var(--muted); font-size: 12px; margin-bottom: 16px; }
  .card-dates { display: flex; gap: 6px; }
  .card-date-block {
    flex: 1; padding: 9px 0;
    background: var(--surface2);
    border-radius: 3px; text-align: center;
  }
  .date-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
    color: var(--muted); text-transform: uppercase;
    display: block; margin-bottom: 3px;
  }
  .date-val { font-size: 12px; font-weight: 600; color: var(--text); }
  .date-val.race { color: var(--red); font-weight: 700; }
  .card-bottom {
    margin-top: 14px; padding-top: 14px;
    border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    min-height: 28px;
  }
  .countdown {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 15px; color: var(--red);
  }
  .countdown.muted { color: var(--muted); }
  .next-label {
    font-size: 10px; letter-spacing: 1.5px;
    color: var(--accent); font-weight: 700; text-transform: uppercase;
    background: rgba(255,107,53,0.12); padding: 3px 9px; border-radius: 2px;
    border: 1px solid rgba(255,107,53,0.3);
  }
  .completed-tag { font-size: 10px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; }

  /* ── DRIVER AVATAR ──────────────────────────────────────────────────────── */
  .drv-avatar {
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; flex-shrink: 0;
    position: relative; overflow: hidden;
  }
  .drv-avatar::after {
    content: ''; position: absolute; inset: 0; border-radius: 50%;
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── LEADERBOARD ────────────────────────────────────────────────────────── */
  .race-header {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 4px; padding: 22px 28px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 24px;
    flex-wrap: wrap; gap: 16px;
  }
  .race-header-info { flex: 1; min-width: 200px; }
  .race-header-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 38px; letter-spacing: 1px; color: var(--text);
  }
  .race-header-circuit { color: var(--muted); font-size: 13px; margin-top: 2px; }
  .controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

  .btn {
    padding: 9px 22px;
    background: var(--red); color: #fff;
    border: none; border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px; letter-spacing: 1.5px;
    text-transform: uppercase; cursor: pointer;
    transition: opacity 0.2s, transform 0.12s, box-shadow 0.2s;
    box-shadow: 0 4px 16px rgba(225,6,0,0.3);
  }
  .btn:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(225,6,0,0.4); }
  .btn:active { transform: translateY(0); }
  .btn.secondary {
    background: var(--surface2); color: var(--text);
    border: 1px solid var(--border); box-shadow: none;
  }
  .btn.secondary:hover { border-color: var(--border2); box-shadow: none; }

  .lap-info {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px; color: var(--muted); letter-spacing: 2px;
    text-transform: uppercase;
  }
  .lap-number {
    color: var(--text); font-size: 26px; display: inline-block;
    animation: lapTick 0.25s ease;
  }

  .leaderboard {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .lb-header {
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: 52px 1fr 84px 110px;
    gap: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    color: var(--muted); text-transform: uppercase;
  }
  .lb-list { position: relative; }
  .lb-row {
    display: grid;
    grid-template-columns: 52px 1fr 84px 110px;
    gap: 8px;
    padding: 0 24px;
    height: 62px;
    align-items: center;
    border-bottom: 1px solid var(--border);
    transition: background 0.3s ease;
    will-change: transform;
    position: relative;
  }
  .lb-row:last-child { border-bottom: none; }
  .lb-row:hover { background: rgba(255,255,255,0.028); }
  .lb-row.overtook { animation: overtakeFlash 0.8s ease forwards; }
  .lb-row.dropped  { animation: dropFlash  0.8s ease forwards; }

  .pos-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 22px; color: var(--muted);
    text-align: center; line-height: 1;
  }
  .pos-num.p1 { color: var(--gold); animation: glowPulse 2.5s ease infinite; }
  .pos-num.p2 { color: var(--silver); }
  .pos-num.p3 { color: var(--bronze); }

  .driver-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .team-bar { width: 3px; height: 40px; border-radius: 2px; flex-shrink: 0; }
  .driver-abbr {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 18px; letter-spacing: 0.5px;
    color: var(--text); min-width: 38px;
  }
  .driver-name-full { font-size: 12px; color: var(--muted2); line-height: 1.3; }
  .driver-team-name { font-size: 10px; color: var(--muted); }

  .pos-change {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 14px; text-align: center; letter-spacing: 0.5px;
  }
  .pos-change.up   { color: var(--up); }
  .pos-change.down { color: var(--down); }
  .pos-change.same { color: var(--muted); }

  .gap-cell {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; color: var(--muted); text-align: right; letter-spacing: 0.5px;
  }
  .gap-cell.leader { color: var(--gold); font-weight: 700; font-size: 11px; letter-spacing: 2px; }

  .sc-banner {
    background: linear-gradient(90deg, rgba(255,215,0,0.15), transparent);
    border-left: 3px solid var(--gold);
    padding: 12px 24px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 14px; letter-spacing: 2.5px;
    color: var(--gold); text-transform: uppercase;
    display: flex; align-items: center; gap: 10px;
    animation: scFlash 0.5s ease;
  }

  .replay-bar {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 24px;
    background: var(--surface2); border-top: 1px solid var(--border);
  }
  .replay-slider {
    flex: 1; -webkit-appearance: none;
    height: 3px; border-radius: 2px; background: var(--border); cursor: pointer;
    outline: none;
  }
  .replay-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 15px; height: 15px;
    border-radius: 50%; background: var(--red); cursor: pointer;
    box-shadow: 0 0 10px rgba(225,6,0,0.6);
    transition: transform 0.1s;
  }
  .replay-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }

  /* ── RACE SELECT ─────────────────────────────────────────────────────────── */
  .race-select-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px;
    margin-bottom: 24px;
  }
  .race-select-btn {
    padding: 11px 14px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 3px;
    color: var(--muted); font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600; font-size: 13px; cursor: pointer;
    transition: all 0.18s; text-align: left; letter-spacing: 0.5px;
  }
  .race-select-btn:hover { border-color: var(--border2); color: var(--text); }
  .race-select-btn.active { border-color: var(--red); color: var(--text); background: rgba(225,6,0,0.08); }

  /* ── HIGHLIGHTS ──────────────────────────────────────────────────────────── */
  .highlights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 14px; margin-top: 24px;
  }
  .highlight-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 4px; padding: 20px 22px; cursor: pointer;
    transition: border-color 0.2s, transform 0.18s, box-shadow 0.2s;
    animation: fadeInUp 0.4s ease both;
  }
  .highlight-card:hover { border-color: var(--border2); transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.45); }
  .hl-type {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    text-transform: uppercase; margin-bottom: 12px;
    display: flex; align-items: center; gap: 7px;
  }
  .hl-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .hl-title { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 18px; margin-bottom: 8px; }
  .hl-desc { font-size: 13px; color: var(--muted2); line-height: 1.55; }
  .hl-time { font-size: 11px; color: var(--muted); margin-top: 12px; letter-spacing: 1px; }

  /* ── STANDINGS ───────────────────────────────────────────────────────────── */
  .standings-wrap { animation: fadeInUp 0.35s ease both; }
  .standings-list { margin-top: 16px; }
  .standings-row {
    display: grid;
    grid-template-columns: 56px 60px 1fr 160px 80px;
    gap: 12px;
    align-items: center;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    transition: background 0.2s;
    animation: slideInLeft 0.4s ease both;
  }
  .standings-row:last-child { border-bottom: none; }
  .standings-row:hover { background: rgba(255,255,255,0.025); }
  .std-pos {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 22px; color: var(--muted);
    text-align: center;
  }
  .std-pos.p1 { color: var(--gold); }
  .std-pos.p2 { color: var(--silver); }
  .std-pos.p3 { color: var(--bronze); }
  .std-driver { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .std-name-block { min-width: 0; }
  .std-abbr {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 17px; color: var(--text); display: flex; align-items: center; gap: 6px;
  }
  .std-full { font-size: 12px; color: var(--muted2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .std-team { font-size: 11px; color: var(--muted); white-space: nowrap; }
  .std-pts {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 20px; color: var(--text);
    text-align: right; min-width: 40px;
  }
  .std-bar-wrap { display: flex; align-items: center; }
  .std-bar {
    height: 4px; border-radius: 2px; min-width: 2px;
    transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    animation: fadeIn 0.5s ease both;
  }

  /* CONSTRUCTOR STANDINGS */
  .con-row {
    display: grid;
    grid-template-columns: 56px 1fr 200px 80px;
    gap: 12px;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    transition: background 0.2s;
    animation: slideInLeft 0.4s ease both;
  }
  .con-row:last-child { border-bottom: none; }
  .con-row:hover { background: rgba(255,255,255,0.025); }
  .con-team { display: flex; align-items: center; gap: 12px; }
  .con-swatch { width: 4px; height: 42px; border-radius: 2px; flex-shrink: 0; }
  .con-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 18px; color: var(--text);
  }
  .con-base { font-size: 12px; color: var(--muted); }

  /* ── DRIVERS PAGE ─────────────────────────────────────────────────────────── */
  .drivers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
    gap: 16px;
    margin-top: 24px;
  }
  .driver-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    animation: fadeInUp 0.4s ease both;
    position: relative;
  }
  .driver-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    border-color: var(--border2);
  }
  .driver-card-top {
    padding: 22px 22px 18px;
    position: relative;
    overflow: hidden;
  }
  .driver-card-bg {
    position: absolute; inset: 0;
    opacity: 0.06;
    background-size: cover;
  }
  .driver-card-num {
    position: absolute; right: -4px; top: -10px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 88px; line-height: 1;
    opacity: 0.12; pointer-events: none; user-select: none;
    color: var(--text); letter-spacing: -4px;
  }
  .driver-card-avatar-row { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
  .driver-card-info { flex: 1; min-width: 0; }
  .driver-card-num-small {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 12px; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase; margin-bottom: 2px;
  }
  .driver-card-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 20px; color: var(--text); line-height: 1.1;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .driver-card-team { font-size: 12px; color: var(--muted2); margin-top: 2px; }
  .driver-card-bottom {
    padding: 14px 22px;
    border-top: 1px solid var(--border);
    background: var(--surface2);
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
  }
  .driver-stat-block { text-align: center; }
  .driver-stat-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 20px; color: var(--text); line-height: 1;
  }
  .driver-stat-lbl {
    font-size: 9px; color: var(--muted); letter-spacing: 1.5px;
    text-transform: uppercase; margin-top: 3px;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 600;
  }

  /* ── TEAMS PAGE ──────────────────────────────────────────────────────────── */
  .teams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    margin-top: 24px;
  }
  .team-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    animation: fadeInUp 0.4s ease both;
    position: relative;
  }
  .team-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    border-color: var(--border2);
  }
  .team-card-accent { height: 4px; width: 100%; }
  .team-card-body { padding: 20px 22px; }
  .team-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .team-badge {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 28px; letter-spacing: 2px;
    line-height: 1;
  }
  .team-champ-badge {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    padding: 4px 10px; border-radius: 2px;
    background: rgba(255,215,0,0.12); color: var(--gold);
    border: 1px solid rgba(255,215,0,0.3);
  }
  .team-name { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; color: var(--text); margin-bottom: 4px; }
  .team-base { font-size: 12px; color: var(--muted); margin-bottom: 16px; }
  .team-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .team-meta-item { background: var(--surface2); border-radius: 3px; padding: 10px 12px; }
  .team-meta-lbl { font-size: 9px; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; }
  .team-meta-val { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 15px; color: var(--text); margin-top: 2px; }
  .team-drivers { padding: 14px 22px; border-top: 1px solid var(--border); display: flex; gap: 10px; }
  .team-driver-chip {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface2); border-radius: 3px; padding: 7px 12px;
    flex: 1;
  }
  .team-driver-chip-name { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 14px; color: var(--text); }
  .team-driver-chip-flag { font-size: 14px; }

  /* ── GENERAL ─────────────────────────────────────────────────────────────── */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: var(--surface); }
  ::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }

  select {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 7px 12px; border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; letter-spacing: 1px; cursor: pointer;
    outline: none; transition: border-color 0.2s;
  }
  select:hover { border-color: var(--border2); }

  @media (max-width: 768px) {
    .page { padding: 20px 16px; }
    .page-title { font-size: 36px; }
    .nav { padding: 0 16px; }
    .nav-logo { margin-right: 20px; font-size: 18px; }
    .nav-tab { padding: 0 12px; font-size: 12px; }
    .lb-header, .lb-row { grid-template-columns: 44px 1fr 70px; }
    .lb-header > *:last-child, .lb-row > *:last-child { display: none; }
    .standings-row { grid-template-columns: 44px 48px 1fr 70px; }
    .standings-row > *:nth-child(4) { display: none; }
    .con-row { grid-template-columns: 44px 1fr 70px; }
    .con-row > *:nth-child(3) { display: none; }
    .drivers-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
    .teams-grid   { grid-template-columns: 1fr; }
    .race-header  { flex-direction: column; align-items: flex-start; }
  }
`;

// ── DRIVER AVATAR COMPONENT ───────────────────────────────────────────────────
function DriverAvatar({ driver, size = 44 }) {
  const initials = driverInitials(driver.name);
  const fontSize = size * 0.34;
  const numSize  = size * 0.28;
  return (
    <div
      className="drv-avatar"
      style={{
        width: size, height: size,
        background: `radial-gradient(circle at 35% 35%, ${driver.color}55, ${driver.color}18)`,
        border: `2px solid ${driver.color}70`,
        boxShadow: `0 0 14px ${driver.color}22`,
        fontSize,
        color: driver.color,
        flexDirection: "column",
        gap: 0,
      }}
    >
      <span style={{ fontWeight: 900, lineHeight: 1, fontSize }}>{initials}</span>
      <span style={{ fontWeight: 700, fontSize: numSize, opacity: 0.6, lineHeight: 1 }}>#{driver.number}</span>
    </div>
  );
}

// ── LEADERBOARD COMPONENT ─────────────────────────────────────────────────────
function Leaderboard({ lapData, lapIndex, totalLaps }) {
  const [prevOrder, setPrevOrder] = useState(null);
  const [flashMap,  setFlashMap]  = useState({});

  const currentOrder = lapData[lapIndex]?.order || [];
  const isSC         = lapData[lapIndex]?.safetycar;

  useEffect(() => {
    if (!prevOrder || prevOrder.length === 0) { setPrevOrder(currentOrder); return; }
    const newFlash = {};
    currentOrder.forEach((id, i) => {
      const prevIdx = prevOrder.indexOf(id);
      if (prevIdx > i) newFlash[id] = "up";
      else if (prevIdx < i) newFlash[id] = "down";
    });
    setFlashMap(newFlash);
    const t = setTimeout(() => setFlashMap({}), 900);
    setPrevOrder(currentOrder);
    return () => clearTimeout(t);
  }, [lapIndex]);

  return (
    <div className="leaderboard">
      {isSC && (
        <div className="sc-banner">
          <span>🟡</span> Safety Car Deployed
        </div>
      )}
      <div className="lb-header">
        <span>POS</span>
        <span>DRIVER</span>
        <span style={{ textAlign: "center" }}>DELTA</span>
        <span style={{ textAlign: "right" }}>GAP</span>
      </div>
      <div className="lb-list">
        {currentOrder.map((id, idx) => {
          const driver  = getDriver(id);
          const prevIdx = prevOrder ? prevOrder.indexOf(id) : idx;
          const delta   = prevIdx - idx;
          const flash   = flashMap[id];
          const pos     = idx + 1;
          const gap     = idx === 0
            ? "LEADER"
            : `+${(idx * 1.28 + Math.random() * 0.6).toFixed(3)}s`;
          return (
            <div
              key={id}
              className={`lb-row${flash === "up" ? " overtook" : flash === "down" ? " dropped" : ""}`}
            >
              <div className={`pos-num${pos===1?" p1":pos===2?" p2":pos===3?" p3":""}`}>{pos}</div>
              <div className="driver-cell">
                <div className="team-bar" style={{ background: driver.color }} />
                <DriverAvatar driver={driver} size={40} />
                <div>
                  <div className="driver-abbr">{driver.flag} {driver.id}</div>
                  <div className="driver-name-full">{driver.name}</div>
                  <div className="driver-team-name">{driver.team}</div>
                </div>
              </div>
              <div className={`pos-change ${delta > 0 ? "up" : delta < 0 ? "down" : "same"}`}>
                {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : "—"}
              </div>
              <div className={`gap-cell ${idx === 0 ? "leader" : ""}`}>{gap}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── RACE TRACKER PAGE ─────────────────────────────────────────────────────────
function RaceTrackerPage() {
  const [selectedRace, setSelectedRace] = useState(RACES_2026[0]);
  const [lapIndex,     setLapIndex]     = useState(0);
  const [playing,      setPlaying]      = useState(false);
  const [speed,        setSpeed]        = useState(600);
  const [lapData]                       = useState(AUS_LAPS);
  const [section,      setSection]      = useState("race");
  const intervalRef = useRef(null);
  const totalLaps   = lapData.length - 1;

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setLapIndex(i => {
          if (i >= totalLaps) { setPlaying(false); return i; }
          return i + 1;
        });
      }, speed);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, totalLaps]);

  const reset = () => { setPlaying(false); setLapIndex(0); };

  const highlights = {
    fri: [
      { type: "FP1", color: "#27F4D2", title: "Norris sets early pace",      desc: "Lando Norris topped FP1 with a 1:21.432 on mediums, 0.2s ahead of Verstappen.", time: "FP1 — Lap 8" },
      { type: "FP2", color: "#27F4D2", title: "Ferrari struggles on long runs", desc: "Both Hamilton and Leclerc showed concerning pace on high-fuel runs, 1.2s off McLaren.", time: "FP2 — Lap 22" },
      { type: "INCIDENT", color: "#ffd700", title: "Antonelli spins at T9",   desc: "The rookie Mercedes driver lost the rear under braking and spun into the gravel. No damage.", time: "FP2 — Lap 31" },
    ],
    sat: [
      { type: "Q1", color: "#FF8000", title: "Albon eliminated in Q1",     desc: "Alex Albon missed the Q2 cut after a yellow flag ruined his final flying lap.", time: "Q1 — Final" },
      { type: "Q2", color: "#FF8000", title: "Russell leads Q2",            desc: "George Russell set a stunning 1:19.882 to top Q2, with Red Bull in P4 and P5.", time: "Q2 — Final" },
      { type: "Q3", color: "#e10600", title: "POLE: Norris P1",             desc: "Lando Norris storms to pole position with a 1:18.441, edging Piastri by 0.087s.", time: "Q3 — Final" },
    ],
  };

  const hls = section === "fri" ? highlights.fri : highlights.sat;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Race <span>Tracker</span></div>
        <div className="page-sub">Lap-by-lap live simulation · 2026 Season</div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>
          Select Race Weekend
        </div>
        <div className="race-select-grid">
          {RACES_2026.filter(r => r.status === "completed" || r.status === "next").map(r => (
            <button
              key={r.round}
              className={`race-select-btn${selectedRace.round === r.round ? " active" : ""}`}
              onClick={() => setSelectedRace(r)}
            >
              {r.country} R{r.round} · {r.name}
              {r.status === "next" && <span style={{ marginLeft: 6, color: "var(--accent)", fontSize: 9 }}>NEXT</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="section-tabs">
        <button className={`section-tab${section === "fri"  ? " active" : ""}`} onClick={() => setSection("fri")}>🔵 Friday</button>
        <button className={`section-tab${section === "sat"  ? " active" : ""}`} onClick={() => setSection("sat")}>🟡 Qualifying</button>
        <button className={`section-tab${section === "race" ? " active" : ""}`} onClick={() => setSection("race")}>🔴 Race Day</button>
      </div>

      {section === "race" ? (
        <>
          <div className="race-header">
            <div className="race-header-info">
              <div className="race-header-name">{selectedRace.country} {selectedRace.name}</div>
              <div className="race-header-circuit">{selectedRace.circuit} · {selectedRace.city}</div>
            </div>
            <div className="controls">
              <div className="lap-info">
                LAP <span className="lap-number" key={lapIndex}>{lapIndex}</span> / {totalLaps}
              </div>
              <button className="btn secondary" onClick={reset}>↺ RESET</button>
              <button className="btn" onClick={() => setPlaying(p => !p)}>
                {playing ? "⏸ PAUSE" : lapIndex === 0 ? "▶ SIMULATE" : "▶ RESUME"}
              </button>
              <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
                <option value={1000}>1× Speed</option>
                <option value={600}>2× Speed</option>
                <option value={250}>5× Speed</option>
                <option value={80}>10× Speed</option>
              </select>
            </div>
          </div>

          <Leaderboard lapData={lapData} lapIndex={lapIndex} totalLaps={totalLaps} />

          <div className="replay-bar">
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: "var(--muted)", letterSpacing: 1, minWidth: 36 }}>LAP 0</span>
            <input
              type="range" min={0} max={totalLaps} value={lapIndex}
              className="replay-slider"
              onChange={e => { setPlaying(false); setLapIndex(Number(e.target.value)); }}
            />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: "var(--muted)", letterSpacing: 1, minWidth: 36, textAlign: "right" }}>LAP {totalLaps}</span>
          </div>
        </>
      ) : (
        <div className="highlights-grid">
          {hls.map((h, i) => (
            <div className="highlight-card" key={i} style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="hl-type" style={{ color: h.color }}>
                <div className="hl-dot" style={{ background: h.color }} />
                {h.type}
              </div>
              <div className="hl-title">{h.title}</div>
              <div className="hl-desc">{h.desc}</div>
              <div className="hl-time">{h.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CALENDAR PAGE ─────────────────────────────────────────────────────────────
function CalendarPage() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "sprint" ? RACES_2026.filter(r => r.sprint) : RACES_2026;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">2026 <span>Season</span></div>
        <div className="page-sub">24 Grand Prix · 6 Sprint Weekends · New Era Regulations</div>
      </div>

      <div className="section-tabs">
        <button className={`section-tab${filter === "all"    ? " active" : ""}`} onClick={() => setFilter("all")}>All Races</button>
        <button className={`section-tab${filter === "sprint" ? " active" : ""}`} onClick={() => setFilter("sprint")}>Sprint Weekends</button>
      </div>

      <div className="calendar-grid">
        {filtered.map((race, i) => {
          const days = (race.status === "upcoming" || race.status === "next") ? daysUntil(race.month, race.day) : null;
          return (
            <div
              key={race.round}
              className={`race-card${race.status === "completed" ? " completed" : race.status === "next" ? " next" : ""}`}
              style={{ animationDelay: `${i * 0.035}s` }}
            >
              <div className="card-round">
                <span>Round {race.round} · {race.status === "completed" ? "✓ Completed" : race.status === "next" ? "→ Next Race" : "Upcoming"}</span>
                {race.sprint && <span className="sprint-badge">SPRINT</span>}
              </div>
              <span className="card-flag">{race.country}</span>
              <div className="card-name">{race.name}</div>
              <div className="card-circuit">{race.circuit} · {race.city}</div>
              <div className="card-dates">
                <div className="card-date-block">
                  <span className="date-label">Fri</span>
                  <span className="date-val">{race.dates.fri}</span>
                </div>
                <div className="card-date-block">
                  <span className="date-label">Sat</span>
                  <span className="date-val">{race.dates.sat}</span>
                </div>
                <div className="card-date-block">
                  <span className="date-label">Race</span>
                  <span className="date-val race">{race.dates.sun || race.dates.sat}</span>
                </div>
              </div>
              <div className="card-bottom">
                {race.status === "completed" && <span className="completed-tag">✓ Result Available</span>}
                {race.status === "next" && (
                  <>
                    <span className="countdown">In {days} days</span>
                    <span className="next-label">Next Race</span>
                  </>
                )}
                {race.status === "upcoming" && days !== null && (
                  <span className="countdown muted">In {days} days</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STANDINGS PAGE ────────────────────────────────────────────────────────────
function StandingsPage() {
  const [view, setView] = useState("drivers");
  const maxDrv = STANDINGS[0].pts;
  const maxCon = CONSTRUCTOR_STANDINGS[0].pts;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Championship <span>Standings</span></div>
        <div className="page-sub">After Round 1 · Australian Grand Prix</div>
      </div>

      <div className="section-tabs">
        <button className={`section-tab${view === "drivers"      ? " active" : ""}`} onClick={() => setView("drivers")}>Drivers</button>
        <button className={`section-tab${view === "constructors" ? " active" : ""}`} onClick={() => setView("constructors")}>Constructors</button>
      </div>

      {view === "drivers" ? (
        <div className="standings-wrap leaderboard">
          {STANDINGS.map((s, i) => {
            const driver = getDriver(s.id);
            const barPct = maxDrv > 0 ? (s.pts / maxDrv) * 160 : 0;
            return (
              <div className="standings-row" key={s.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className={`std-pos${i===0?" p1":i===1?" p2":i===2?" p3":""}`}>{i + 1}</div>
                <DriverAvatar driver={driver} size={46} />
                <div className="std-driver">
                  <div className="std-name-block">
                    <div className="std-abbr">{driver.flag} {driver.id}</div>
                    <div className="std-full">{driver.name}</div>
                    <div className="std-team">{driver.team}</div>
                  </div>
                </div>
                <div className="std-bar-wrap">
                  {s.pts > 0 && (
                    <div className="std-bar" style={{ width: barPct, background: driver.color, opacity: 0.75 }} />
                  )}
                </div>
                <div className="std-pts">{s.pts}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="standings-wrap leaderboard">
          {CONSTRUCTOR_STANDINGS.map((c, i) => {
            const team   = getTeam(c.id);
            const barPct = maxCon > 0 ? (c.pts / maxCon) * 180 : 0;
            const drivers = DRIVERS.filter(d => d.teamId === c.id).slice(0, 2);
            return (
              <div className="con-row" key={c.id} style={{ animationDelay: `${i * 0.05}s` }}>
                <div className={`std-pos${i===0?" p1":i===1?" p2":i===2?" p3":""}`}>{i + 1}</div>
                <div className="con-team">
                  <div className="con-swatch" style={{ background: team.color }} />
                  <div>
                    <div className="con-name">{team.name}</div>
                    <div className="con-base">{drivers.map(d => d.id).join(" · ")}</div>
                  </div>
                </div>
                <div className="std-bar-wrap">
                  {c.pts > 0 && (
                    <div className="std-bar" style={{ width: barPct, background: team.color, opacity: 0.75 }} />
                  )}
                </div>
                <div className="std-pts">{c.pts}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DRIVERS PAGE ──────────────────────────────────────────────────────────────
function DriversPage() {
  const [filterTeam, setFilterTeam] = useState("all");
  const filtered = filterTeam === "all" ? DRIVERS : DRIVERS.filter(d => d.teamId === filterTeam);
  const standing = id => { const idx = STANDINGS.findIndex(s => s.id === id); return idx >= 0 ? idx + 1 : "—"; };
  const pts      = id => { const s = STANDINGS.find(s => s.id === id); return s ? s.pts : 0; };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">2026 <span>Drivers</span></div>
        <div className="page-sub">20 drivers · 10 constructors · New era regulations</div>
      </div>

      <div className="section-tabs" style={{ flexWrap: "wrap" }}>
        <button className={`section-tab${filterTeam === "all" ? " active" : ""}`} onClick={() => setFilterTeam("all")}>All</button>
        {TEAMS.map(t => (
          <button
            key={t.id}
            className={`section-tab${filterTeam === t.id ? " active" : ""}`}
            onClick={() => setFilterTeam(t.id)}
            style={filterTeam === t.id ? { background: t.color, borderColor: t.color } : {}}
          >
            {t.shortName}
          </button>
        ))}
      </div>

      <div className="drivers-grid">
        {filtered.map((d, i) => (
          <div className="driver-card" key={d.id} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="driver-card-top" style={{ background: `linear-gradient(135deg, ${d.color}14, transparent)` }}>
              <div className="driver-card-num" style={{ color: d.color }}>{d.number}</div>
              <div className="driver-card-avatar-row">
                <DriverAvatar driver={d} size={56} />
                <div className="driver-card-info">
                  <div className="driver-card-num-small" style={{ color: d.color }}>#{d.number} · {d.flag}</div>
                  <div className="driver-card-name">{d.name}</div>
                  <div className="driver-card-team" style={{ color: d.color }}>{d.team}</div>
                </div>
              </div>
            </div>
            <div className="driver-card-bottom">
              <div className="driver-stat-block">
                <div className="driver-stat-val">{standing(d.id)}</div>
                <div className="driver-stat-lbl">Position</div>
              </div>
              <div className="driver-stat-block">
                <div className="driver-stat-val">{pts(d.id)}</div>
                <div className="driver-stat-lbl">Points</div>
              </div>
              <div className="driver-stat-block">
                <div className="driver-stat-val">{d.podiums}</div>
                <div className="driver-stat-lbl">Podiums</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TEAMS PAGE ────────────────────────────────────────────────────────────────
function TeamsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">2026 <span>Teams</span></div>
        <div className="page-sub">10 Constructors · New Hybrid Power Unit Regulations</div>
      </div>

      <div className="teams-grid">
        {TEAMS.map((team, i) => {
          const conStand = CONSTRUCTOR_STANDINGS.find(c => c.id === team.id);
          const conPos   = CONSTRUCTOR_STANDINGS.findIndex(c => c.id === team.id) + 1;
          const teamDrivers = DRIVERS.filter(d => d.teamId === team.id).slice(0, 2);
          return (
            <div className="team-card" key={team.id} style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="team-card-accent" style={{ background: `linear-gradient(90deg, ${team.color}, ${team.color2})` }} />
              <div className="team-card-body">
                <div className="team-card-header">
                  <div className="team-badge" style={{ color: team.color }}>{team.shortName}</div>
                  {team.championships > 0 && (
                    <div className="team-champ-badge">🏆 {team.championships}× WCC</div>
                  )}
                </div>
                <div className="team-name">{team.name}</div>
                <div className="team-base">📍 {team.base}</div>
                <div className="team-meta">
                  <div className="team-meta-item">
                    <div className="team-meta-lbl">Chassis</div>
                    <div className="team-meta-val">{team.chassis}</div>
                  </div>
                  <div className="team-meta-item">
                    <div className="team-meta-lbl">Power Unit</div>
                    <div className="team-meta-val">{team.engine}</div>
                  </div>
                  <div className="team-meta-item">
                    <div className="team-meta-lbl">Con. Pos.</div>
                    <div className="team-meta-val" style={{ color: conPos === 1 ? "var(--gold)" : conPos === 2 ? "var(--silver)" : conPos === 3 ? "var(--bronze)" : "var(--text)" }}>P{conPos}</div>
                  </div>
                  <div className="team-meta-item">
                    <div className="team-meta-lbl">Points</div>
                    <div className="team-meta-val">{conStand?.pts ?? 0}</div>
                  </div>
                </div>
              </div>
              {teamDrivers.length > 0 && (
                <div className="team-drivers">
                  {teamDrivers.map(d => (
                    <div className="team-driver-chip" key={d.id}>
                      <DriverAvatar driver={d} size={30} />
                      <div>
                        <div className="team-driver-chip-name">{d.id}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>#{d.number}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("calendar");

  return (
    <>
      <style>{css}</style>
      <div className="f1-app">
        <nav className="nav">
          <div className="nav-logo">F1<span>TRACK</span></div>
          <div className="nav-tabs">
            <button className={`nav-tab${tab === "calendar"  ? " active" : ""}`} onClick={() => setTab("calendar")}>Calendar</button>
            <button className={`nav-tab${tab === "race"      ? " active" : ""}`} onClick={() => setTab("race")}>
              <span className="live-dot" />Race Tracker
            </button>
            <button className={`nav-tab${tab === "standings" ? " active" : ""}`} onClick={() => setTab("standings")}>Standings</button>
            <button className={`nav-tab${tab === "drivers"   ? " active" : ""}`} onClick={() => setTab("drivers")}>Drivers</button>
            <button className={`nav-tab${tab === "teams"     ? " active" : ""}`} onClick={() => setTab("teams")}>Teams</button>
          </div>
        </nav>

        {tab === "calendar"  && <CalendarPage />}
        {tab === "race"      && <RaceTrackerPage />}
        {tab === "standings" && <StandingsPage />}
        {tab === "drivers"   && <DriversPage />}
        {tab === "teams"     && <TeamsPage />}
      </div>
    </>
  );
}
