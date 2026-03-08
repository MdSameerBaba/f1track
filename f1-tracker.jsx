import { useState, useEffect, useRef, useCallback } from "react";

// ── DATA ────────────────────────────────────────────────────────────────────

const DRIVERS = [
  { id: "NOR", name: "Lando Norris",      team: "McLaren",       color: "#FF8000", flag: "🇬🇧" },
  { id: "PIA", name: "Oscar Piastri",     team: "McLaren",       color: "#FF8000", flag: "🇦🇺" },
  { id: "VER", name: "Max Verstappen",    team: "Red Bull",      color: "#3671C6", flag: "🇳🇱" },
  { id: "RUS", name: "George Russell",    team: "Mercedes",      color: "#27F4D2", flag: "🇬🇧" },
  { id: "HAM", name: "Lewis Hamilton",    team: "Ferrari",       color: "#E8002D", flag: "🇬🇧" },
  { id: "LEC", name: "Charles Leclerc",   team: "Ferrari",       color: "#E8002D", flag: "🇲🇨" },
  { id: "ANT", name: "Kimi Antonelli",    team: "Mercedes",      color: "#27F4D2", flag: "🇮🇹" },
  { id: "ALO", name: "Fernando Alonso",   team: "Aston Martin",  color: "#358C75", flag: "🇪🇸" },
  { id: "STR", name: "Lance Stroll",      team: "Aston Martin",  color: "#358C75", flag: "🇨🇦" },
  { id: "TSU", name: "Yuki Tsunoda",      team: "Red Bull",      color: "#3671C6", flag: "🇯🇵" },
  { id: "HAD", name: "Isack Hadjar",      team: "Racing Bulls",  color: "#6692FF", flag: "🇫🇷" },
  { id: "LAW", name: "Liam Lawson",       team: "Racing Bulls",  color: "#6692FF", flag: "🇳🇿" },
  { id: "OCO", name: "Esteban Ocon",      team: "Haas",          color: "#B6BABD", flag: "🇫🇷" },
  { id: "BEA", name: "Oliver Bearman",    team: "Haas",          color: "#B6BABD", flag: "🇬🇧" },
  { id: "GAS", name: "Pierre Gasly",      team: "Alpine",        color: "#FF87BC", flag: "🇫🇷" },
  { id: "COL", name: "Franco Colapinto",  team: "Alpine",        color: "#FF87BC", flag: "🇦🇷" },
  { id: "ALB", name: "Alex Albon",        team: "Williams",      color: "#64C4FF", flag: "🇹🇭" },
  { id: "SAI", name: "Carlos Sainz",      team: "Williams",      color: "#64C4FF", flag: "🇪🇸" },
  { id: "HUL", name: "Nico Hulkenberg",   team: "Audi",          color: "#C8B800", flag: "🇩🇪" },
  { id: "BOT", name: "Valtteri Bottas",   team: "Audi",          color: "#C8B800", flag: "🇫🇮" },
];

const RACES_2026 = [
  { round: 1,  name: "Australian GP",       circuit: "Albert Park",         city: "Melbourne",    country: "🇦🇺", dates: { fri: "Mar 6", sat: "Mar 7",  sun: "Mar 8"  }, month: 3,  day: 6,  sprint: false, status: "completed" },
  { round: 2,  name: "Chinese GP",          circuit: "Shanghai Int'l",      city: "Shanghai",     country: "🇨🇳", dates: { fri: "Mar 13", sat: "Mar 14", sun: "Mar 15" }, month: 3,  day: 13, sprint: true,  status: "next" },
  { round: 3,  name: "Japanese GP",         circuit: "Suzuka",              city: "Suzuka",       country: "🇯🇵", dates: { fri: "Mar 27", sat: "Mar 28", sun: "Mar 29" }, month: 3,  day: 27, sprint: false, status: "upcoming" },
  { round: 4,  name: "Bahrain GP",          circuit: "Bahrain Int'l",       city: "Sakhir",       country: "🇧🇭", dates: { fri: "Apr 10", sat: "Apr 11", sun: "Apr 12" }, month: 4,  day: 10, sprint: false, status: "upcoming" },
  { round: 5,  name: "Saudi Arabian GP",    circuit: "Jeddah Corniche",     city: "Jeddah",       country: "🇸🇦", dates: { fri: "Apr 17", sat: "Apr 18", sun: "Apr 19" }, month: 4,  day: 17, sprint: false, status: "upcoming" },
  { round: 6,  name: "Miami GP",            circuit: "Miami Int'l",         city: "Miami",        country: "🇺🇸", dates: { fri: "May 1",  sat: "May 2",  sun: "May 3"  }, month: 5,  day: 1,  sprint: true,  status: "upcoming" },
  { round: 7,  name: "Canadian GP",         circuit: "Circuit Gilles V.",   city: "Montréal",     country: "🇨🇦", dates: { fri: "May 22", sat: "May 23", sun: "May 24" }, month: 5,  day: 22, sprint: true,  status: "upcoming" },
  { round: 8,  name: "Monaco GP",           circuit: "Circuit de Monaco",   city: "Monaco",       country: "🇲🇨", dates: { fri: "Jun 5",  sat: "Jun 6",  sun: "Jun 7"  }, month: 6,  day: 5,  sprint: false, status: "upcoming" },
  { round: 9,  name: "Barcelona GP",        circuit: "Circuit de Cataluña", city: "Barcelona",    country: "🇪🇸", dates: { fri: "Jun 12", sat: "Jun 13", sun: "Jun 14" }, month: 6,  day: 12, sprint: false, status: "upcoming" },
  { round: 10, name: "Austrian GP",         circuit: "Red Bull Ring",       city: "Spielberg",    country: "🇦🇹", dates: { fri: "Jun 26", sat: "Jun 27", sun: "Jun 28" }, month: 6,  day: 26, sprint: false, status: "upcoming" },
  { round: 11, name: "British GP",          circuit: "Silverstone",         city: "Silverstone",  country: "🇬🇧", dates: { fri: "Jul 3",  sat: "Jul 4",  sun: "Jul 5"  }, month: 7,  day: 3,  sprint: true,  status: "upcoming" },
  { round: 12, name: "Belgian GP",          circuit: "Spa-Francorchamps",   city: "Spa",          country: "🇧🇪", dates: { fri: "Jul 17", sat: "Jul 18", sun: "Jul 19" }, month: 7,  day: 17, sprint: false, status: "upcoming" },
  { round: 13, name: "Hungarian GP",        circuit: "Hungaroring",         city: "Budapest",     country: "🇭🇺", dates: { fri: "Jul 24", sat: "Jul 25", sun: "Jul 26" }, month: 7,  day: 24, sprint: false, status: "upcoming" },
  { round: 14, name: "Dutch GP",            circuit: "Zandvoort",           city: "Zandvoort",    country: "🇳🇱", dates: { fri: "Aug 21", sat: "Aug 22", sun: "Aug 23" }, month: 8,  day: 21, sprint: true,  status: "upcoming" },
  { round: 15, name: "Italian GP",          circuit: "Monza",               city: "Monza",        country: "🇮🇹", dates: { fri: "Sep 4",  sat: "Sep 5",  sun: "Sep 6"  }, month: 9,  day: 4,  sprint: false, status: "upcoming" },
  { round: 16, name: "Madrid GP",           circuit: "Circuito de Madrid",  city: "Madrid",       country: "🇪🇸", dates: { fri: "Sep 11", sat: "Sep 12", sun: "Sep 13" }, month: 9,  day: 11, sprint: false, status: "upcoming" },
  { round: 17, name: "Azerbaijan GP",       circuit: "Baku City Circuit",   city: "Baku",         country: "🇦🇿", dates: { fri: "Sep 25", sat: "Sep 26", sun: ""        }, month: 9,  day: 25, sprint: false, status: "upcoming" },
  { round: 18, name: "Singapore GP",        circuit: "Marina Bay",          city: "Singapore",    country: "🇸🇬", dates: { fri: "Oct 9",  sat: "Oct 10", sun: "Oct 11" }, month: 10, day: 9,  sprint: true,  status: "upcoming" },
  { round: 19, name: "United States GP",    circuit: "COTA",                city: "Austin",       country: "🇺🇸", dates: { fri: "Oct 23", sat: "Oct 24", sun: "Oct 25" }, month: 10, day: 23, sprint: false, status: "upcoming" },
  { round: 20, name: "Mexico City GP",      circuit: "Autodromo H.",        city: "Mexico City",  country: "🇲🇽", dates: { fri: "Oct 30", sat: "Oct 31", sun: "Nov 1"  }, month: 10, day: 30, sprint: false, status: "upcoming" },
  { round: 21, name: "São Paulo GP",        circuit: "Interlagos",          city: "São Paulo",    country: "🇧🇷", dates: { fri: "Nov 6",  sat: "Nov 7",  sun: "Nov 8"  }, month: 11, day: 6,  sprint: false, status: "upcoming" },
  { round: 22, name: "Las Vegas GP",        circuit: "Las Vegas Strip",     city: "Las Vegas",    country: "🇺🇸", dates: { fri: "Nov 20", sat: "Nov 21", sun: ""        }, month: 11, day: 20, sprint: false, status: "upcoming" },
  { round: 23, name: "Qatar GP",            circuit: "Lusail Int'l",        city: "Lusail",       country: "🇶🇦", dates: { fri: "Nov 27", sat: "Nov 28", sun: "Nov 29" }, month: 11, day: 27, sprint: false, status: "upcoming" },
  { round: 24, name: "Abu Dhabi GP",        circuit: "Yas Marina",          city: "Abu Dhabi",    country: "🇦🇪", dates: { fri: "Dec 4",  sat: "Dec 5",  sun: "Dec 6"  }, month: 12, day: 4,  sprint: false, status: "upcoming" },
];

// ── RACE SIMULATION ─────────────────────────────────────────────────────────

function generateRaceLaps(totalLaps = 57) {
  // Starting grid (shuffled from driver list)
  const startGrid = [...DRIVERS].map(d => d.id);
  const shuffled = [...startGrid].sort(() => Math.random() - 0.5);

  const laps = [];
  let currentOrder = [...shuffled];

  // Simulate lap-by-lap position changes
  for (let lap = 0; lap <= totalLaps; lap++) {
    if (lap > 0 && lap % Math.floor(Math.random() * 4 + 2) === 0) {
      // Random overtake
      const idx = Math.floor(Math.random() * (currentOrder.length - 1));
      const temp = currentOrder[idx];
      currentOrder[idx] = currentOrder[idx + 1];
      currentOrder[idx + 1] = temp;
    }
    // Occasional DNF / safety car bunching
    laps.push({
      lap,
      order: [...currentOrder],
      safetycar: lap === Math.floor(totalLaps * 0.35) || lap === Math.floor(totalLaps * 0.7),
      drs: lap > 2,
    });
  }
  return laps;
}

const AUS_LAPS = generateRaceLaps(58);

// Completed race results (AUS 2026 - simulated)
const AUS_RESULT = ["NOR", "VER", "RUS", "PIA", "HAM", "LEC", "ANT", "ALO", "TSU", "HAD",
                    "COL", "BEA", "GAS", "SAI", "STR", "ALB", "LAW", "OCO", "HUL", "BOT"];

// Championship standings after R1
const STANDINGS = [
  { id: "NOR", pts: 25 }, { id: "VER", pts: 18 }, { id: "RUS", pts: 15 },
  { id: "PIA", pts: 12 }, { id: "HAM", pts: 10 }, { id: "LEC", pts: 8  },
  { id: "ANT", pts: 6  }, { id: "ALO", pts: 4  }, { id: "TSU", pts: 2  },
  { id: "HAD", pts: 1  }, { id: "COL", pts: 0  }, { id: "BEA", pts: 0  },
  { id: "GAS", pts: 0  }, { id: "SAI", pts: 0  }, { id: "STR", pts: 0  },
  { id: "ALB", pts: 0  }, { id: "LAW", pts: 0  }, { id: "OCO", pts: 0  },
  { id: "HUL", pts: 0  }, { id: "BOT", pts: 0  },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────

const getDriver = id => DRIVERS.find(d => d.id === id) || DRIVERS[0];

function daysUntil(month, day) {
  const now = new Date(2026, 2, 8); // March 8 2026 (today)
  const race = new Date(2026, month - 1, day);
  const diff = Math.ceil((race - now) / (1000 * 60 * 60 * 24));
  return diff;
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #060608;
    --surface: #0d0e14;
    --surface2: #13141d;
    --border: rgba(255,255,255,0.07);
    --red: #e10600;
    --gold: #ffd700;
    --text: #e8e8f0;
    --muted: #5a5a72;
    --accent: #ff6b35;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Barlow', sans-serif; }

  .f1-app {
    min-height: 100vh;
    background: var(--bg);
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(225,6,0,0.08) 0%, transparent 60%),
      repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.015) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.015) 40px);
  }

  /* NAV */
  .nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(6,6,8,0.92);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 0;
    padding: 0 24px;
    height: 56px;
  }
  .nav-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 22px; letter-spacing: 3px;
    color: var(--red); margin-right: 32px;
    text-transform: uppercase;
  }
  .nav-logo span { color: var(--text); }
  .nav-tabs { display: flex; gap: 2px; flex: 1; }
  .nav-tab {
    padding: 0 18px; height: 56px;
    background: none; border: none;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px; letter-spacing: 1.5px;
    text-transform: uppercase; cursor: pointer;
    transition: color 0.2s;
    border-bottom: 3px solid transparent;
    position: relative;
  }
  .nav-tab:hover { color: var(--text); }
  .nav-tab.active { color: var(--text); border-bottom-color: var(--red); }
  .live-dot {
    display: inline-block; width: 7px; height: 7px;
    background: var(--red); border-radius: 50%;
    margin-right: 6px;
    box-shadow: 0 0 8px var(--red);
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  /* CALENDAR */
  .page { padding: 32px 28px; max-width: 1400px; margin: 0 auto; }
  .page-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 48px; letter-spacing: 2px;
    text-transform: uppercase; margin-bottom: 4px;
    color: var(--text);
  }
  .page-sub { color: var(--muted); font-size: 13px; letter-spacing: 1px; margin-bottom: 32px; }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }

  .race-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 18px 20px;
    cursor: pointer;
    transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }
  .race-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: transparent;
    transition: background 0.2s;
  }
  .race-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.4); }
  .race-card:hover::before { background: var(--red); }
  .race-card.completed::before { background: var(--muted); }
  .race-card.next { border-color: rgba(225,6,0,0.4); }
  .race-card.next::before { background: var(--red); }

  .card-round {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase; margin-bottom: 8px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .sprint-badge {
    background: rgba(255,107,53,0.15); color: var(--accent);
    font-size: 9px; letter-spacing: 1px; padding: 2px 6px;
    border-radius: 2px; border: 1px solid rgba(255,107,53,0.3);
  }
  .card-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 22px; letter-spacing: 1px;
    color: var(--text); margin-bottom: 2px;
  }
  .card-circuit { color: var(--muted); font-size: 12px; margin-bottom: 14px; }
  .card-dates {
    display: flex; gap: 6px;
  }
  .card-date-block {
    flex: 1; padding: 8px 0;
    background: var(--surface2);
    border-radius: 3px; text-align: center;
  }
  .date-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
    color: var(--muted); text-transform: uppercase; display: block; margin-bottom: 2px;
  }
  .date-val { font-size: 12px; font-weight: 600; color: var(--text); }
  .date-val.race { color: var(--red); }

  .card-bottom {
    margin-top: 12px; padding-top: 12px;
    border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .countdown {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 14px;
    color: var(--red);
  }
  .next-label {
    font-size: 10px; letter-spacing: 1.5px;
    color: var(--accent); font-weight: 700; text-transform: uppercase;
    background: rgba(255,107,53,0.1); padding: 3px 8px; border-radius: 2px;
    border: 1px solid rgba(255,107,53,0.25);
  }
  .completed-tag {
    font-size: 10px; letter-spacing: 1px;
    color: var(--muted); text-transform: uppercase;
  }

  /* RACE TRACKER */
  .race-header {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 20px 24px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 20px;
  }
  .race-header-info { flex: 1; }
  .race-header-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 36px; letter-spacing: 1px;
    color: var(--text);
  }
  .race-header-circuit { color: var(--muted); font-size: 13px; }
  .controls { display: flex; gap: 8px; align-items: center; }
  .btn {
    padding: 8px 20px;
    background: var(--red); color: #fff;
    border: none; border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }
  .btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  .btn.secondary {
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .btn.secondary:hover { border-color: rgba(255,255,255,0.2); }

  .lap-info {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 14px; color: var(--muted);
    letter-spacing: 1px;
  }
  .lap-number { color: var(--text); font-size: 22px; }

  /* LEADERBOARD */
  .leaderboard {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .lb-header {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: 44px 1fr 90px 90px;
    gap: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase;
  }

  .lb-list { position: relative; }

  .lb-row {
    display: grid;
    grid-template-columns: 44px 1fr 90px 90px;
    gap: 8px;
    padding: 0 20px;
    height: 56px;
    align-items: center;
    border-bottom: 1px solid var(--border);
    transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1),
                background 0.3s ease;
    will-change: transform;
    position: relative;
  }
  .lb-row:last-child { border-bottom: none; }
  .lb-row:hover { background: rgba(255,255,255,0.025); }

  .lb-row.overtook { animation: overtakeFlash 0.7s ease; }
  .lb-row.dropped  { animation: dropFlash 0.7s ease; }

  @keyframes overtakeFlash {
    0%   { background: rgba(0, 255, 120, 0.18); }
    100% { background: transparent; }
  }
  @keyframes dropFlash {
    0%   { background: rgba(255, 60, 60, 0.18); }
    100% { background: transparent; }
  }

  .pos-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 20px; color: var(--muted);
    text-align: center;
  }
  .pos-num.p1 { color: var(--gold); }
  .pos-num.p2 { color: #c0c0c0; }
  .pos-num.p3 { color: #cd7f32; }

  .driver-cell { display: flex; align-items: center; gap: 10px; }
  .team-bar {
    width: 3px; height: 36px; border-radius: 2px;
    flex-shrink: 0;
  }
  .driver-abbr {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800; font-size: 17px; letter-spacing: 0.5px;
    color: var(--text);
    min-width: 36px;
  }
  .driver-name-full { font-size: 12px; color: var(--muted); }
  .driver-team-name { font-size: 10px; color: var(--muted); opacity: 0.7; }

  .pos-change {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px;
    text-align: center;
  }
  .pos-change.up { color: #00e676; }
  .pos-change.down { color: #ff5252; }
  .pos-change.same { color: var(--muted); }

  .gap-cell {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; color: var(--muted);
    text-align: right;
  }
  .gap-cell.leader { color: var(--gold); font-weight: 700; font-size: 11px; letter-spacing: 1px; }

  .sc-banner {
    background: linear-gradient(90deg, rgba(255,215,0,0.15), transparent);
    border-left: 3px solid var(--gold);
    padding: 10px 20px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 14px; letter-spacing: 2px;
    color: var(--gold); text-transform: uppercase;
    display: flex; align-items: center; gap: 8px;
    animation: scFlash 0.5s ease;
  }
  @keyframes scFlash {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .replay-bar {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 20px;
    background: var(--surface2);
    border-top: 1px solid var(--border);
  }
  .replay-slider {
    flex: 1;
    -webkit-appearance: none;
    height: 3px; border-radius: 2px;
    background: var(--border);
    cursor: pointer;
  }
  .replay-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    border-radius: 50%; background: var(--red);
    cursor: pointer;
    box-shadow: 0 0 8px rgba(225,6,0,0.5);
  }

  /* HIGHLIGHTS */
  .highlights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
    margin-top: 24px;
  }
  .highlight-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 18px 20px;
    cursor: pointer;
    transition: border-color 0.2s, transform 0.15s;
  }
  .highlight-card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-2px); }
  .hl-type {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; margin-bottom: 10px;
    display: flex; align-items: center; gap: 6px;
  }
  .hl-dot { width: 6px; height: 6px; border-radius: 50%; }
  .hl-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 17px; margin-bottom: 6px;
  }
  .hl-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }
  .hl-time { font-size: 11px; color: var(--muted); margin-top: 10px; }

  /* STANDINGS */
  .standings-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }
  .standings-table th {
    text-align: left; padding: 10px 14px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase;
    border-bottom: 1px solid var(--border);
  }
  .standings-table td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .standings-table tr:last-child td { border-bottom: none; }
  .standings-table tr:hover td { background: rgba(255,255,255,0.02); }
  .pts-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .pts-bar {
    height: 3px; border-radius: 2px;
    background: var(--red); opacity: 0.6;
    transition: width 0.4s ease;
  }
  .pts-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 16px; color: var(--text);
    min-width: 32px;
  }

  /* RACE SELECT */
  .race-select-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;
    margin-bottom: 20px;
  }
  .race-select-btn {
    padding: 10px 14px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 3px;
    color: var(--muted); font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600; font-size: 13px; cursor: pointer;
    transition: all 0.2s; text-align: left;
  }
  .race-select-btn:hover { border-color: rgba(255,255,255,0.15); color: var(--text); }
  .race-select-btn.active { border-color: var(--red); color: var(--text); background: rgba(225,6,0,0.08); }

  /* SECTION TABS */
  .section-tabs { display: flex; gap: 4px; margin-bottom: 20px; }
  .section-tab {
    padding: 8px 16px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 3px; color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 12px; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer; transition: all 0.2s;
  }
  .section-tab:hover { color: var(--text); }
  .section-tab.active { background: var(--red); color: #fff; border-color: var(--red); }

  /* GENERAL */
  .flex { display: flex; }
  .gap-3 { gap: 12px; }
  .mb-4 { margin-bottom: 16px; }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 2px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .badge-completed { background: rgba(90,90,114,0.2); color: var(--muted); }
  .badge-next { background: rgba(225,6,0,0.12); color: var(--red); border: 1px solid rgba(225,6,0,0.2); }

  /* SCROLL */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--surface); }
  ::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }

  /* RESPONSIVE */
  @media (max-width: 700px) {
    .page { padding: 16px 14px; }
    .page-title { font-size: 32px; }
    .lb-header, .lb-row { grid-template-columns: 36px 1fr 60px; }
    .lb-header > *:last-child, .lb-row > *:last-child { display: none; }
    .calendar-grid { grid-template-columns: 1fr; }
  }
`;

// ── LEADERBOARD COMPONENT ─────────────────────────────────────────────────

function Leaderboard({ lapData, lapIndex, totalLaps }) {
  const [prevOrder, setPrevOrder] = useState(null);
  const [flashMap, setFlashMap] = useState({});

  const currentOrder = lapData[lapIndex]?.order || [];
  const isSC = lapData[lapIndex]?.safetycar;

  useEffect(() => {
    if (!prevOrder || prevOrder.length === 0) {
      setPrevOrder(currentOrder);
      return;
    }
    const newFlash = {};
    currentOrder.forEach((id, i) => {
      const prevIdx = prevOrder.indexOf(id);
      if (prevIdx > i) newFlash[id] = "up";
      else if (prevIdx < i) newFlash[id] = "down";
    });
    setFlashMap(newFlash);
    const t = setTimeout(() => setFlashMap({}), 800);
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
        <span style={{textAlign:"center"}}>CHANGE</span>
        <span style={{textAlign:"right"}}>GAP</span>
      </div>
      <div className="lb-list">
        {currentOrder.map((id, idx) => {
          const driver = getDriver(id);
          const prevIdx = prevOrder ? prevOrder.indexOf(id) : idx;
          const delta = prevIdx - idx;
          const flash = flashMap[id];
          const pos = idx + 1;
          const gap = idx === 0 ? "LEADER" : `+${(idx * 1.24 + Math.random() * 0.8).toFixed(3)}s`;

          return (
            <div
              key={id}
              className={`lb-row${flash === "up" ? " overtook" : flash === "down" ? " dropped" : ""}`}
            >
              <div className={`pos-num${pos === 1 ? " p1" : pos === 2 ? " p2" : pos === 3 ? " p3" : ""}`}>
                {pos}
              </div>
              <div className="driver-cell">
                <div className="team-bar" style={{ background: driver.color }} />
                <div>
                  <div className="driver-abbr">{driver.flag} {driver.id}</div>
                  <div className="driver-name-full">{driver.name}</div>
                  <div className="driver-team-name">{driver.team}</div>
                </div>
              </div>
              <div className={`pos-change ${delta > 0 ? "up" : delta < 0 ? "down" : "same"}`}>
                {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : "—"}
              </div>
              <div className={`gap-cell ${idx === 0 ? "leader" : ""}`}>
                {gap}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── RACE TRACKER PAGE ─────────────────────────────────────────────────────

function RaceTrackerPage() {
  const [selectedRace, setSelectedRace] = useState(RACES_2026[0]);
  const [lapIndex, setLapIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [lapData] = useState(AUS_LAPS);
  const [section, setSection] = useState("race");
  const intervalRef = useRef(null);

  const totalLaps = lapData.length - 1;

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
      { type: "FP1", color: "#27F4D2", title: "Norris sets early pace", desc: "Lando Norris topped FP1 with a 1:21.432 on medium tyres, 0.2s ahead of Verstappen.", time: "FP1 — Lap 8" },
      { type: "FP2", color: "#27F4D2", title: "Ferrari struggles on long runs", desc: "Both Hamilton and Leclerc showed concerning pace on high-fuel runs, 1.2s off McLaren.", time: "FP2 — Lap 22" },
      { type: "INCIDENT", color: "#ffd700", title: "Antonelli spins at Turn 9", desc: "The rookie Mercedes driver lost the rear under braking and spun into the gravel, no damage.", time: "FP2 — Lap 31" },
    ],
    sat: [
      { type: "Q1", color: "#FF8000", title: "Albon eliminated in Q1", desc: "Williams driver Alex Albon missed the cut to Q2 after a yellow flag ruined his final lap.", time: "Q1 — Final" },
      { type: "Q2", color: "#FF8000", title: "Russell leads Q2", desc: "George Russell set a stunning 1:19.882 to top Q2, with both Red Bulls in P4 and P5.", time: "Q2 — Final" },
      { type: "Q3", color: "#e10600", title: "POLE: Norris P1", desc: "Lando Norris storms to pole position with a 1:18.441, narrowly edging Piastri by 0.087s.", time: "Q3 — Final" },
    ],
  };

  const hls = section === "fri" ? highlights.fri : highlights.sat;

  return (
    <div className="page">
      <div className="page-title">Race Tracker</div>
      <div className="page-sub">LAP-BY-LAP LIVE SIMULATION · 2026 SEASON</div>

      {/* Race selector */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,color:"var(--muted)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:8,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>Select Race Weekend</div>
        <div className="race-select-grid">
          {RACES_2026.filter(r => r.status === "completed" || r.status === "next").map(r => (
            <button
              key={r.round}
              className={`race-select-btn${selectedRace.round === r.round ? " active" : ""}`}
              onClick={() => setSelectedRace(r)}
            >
              {r.country} R{r.round} · {r.name}
              {r.status === "next" && <span style={{marginLeft:6,color:"var(--accent)",fontSize:9}}>NEXT</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div className="section-tabs">
        <button className={`section-tab${section === "fri" ? " active" : ""}`} onClick={() => setSection("fri")}>🔵 Friday Highlights</button>
        <button className={`section-tab${section === "sat" ? " active" : ""}`} onClick={() => setSection("sat")}>🟡 Saturday Qualifying</button>
        <button className={`section-tab${section === "race" ? " active" : ""}`} onClick={() => setSection("race")}>🔴 Race Day</button>
      </div>

      {section === "race" ? (
        <>
          {/* Race header */}
          <div className="race-header" style={{marginBottom:20}}>
            <div className="race-header-info">
              <div className="race-header-name">{selectedRace.country} {selectedRace.name}</div>
              <div className="race-header-circuit">{selectedRace.circuit} · {selectedRace.city}</div>
            </div>
            <div className="controls">
              <div className="lap-info">
                LAP <span className="lap-number">{lapIndex}</span>/{totalLaps}
              </div>
              <button className="btn secondary" onClick={reset}>↺ RESET</button>
              <button
                className="btn"
                onClick={() => setPlaying(p => !p)}
              >
                {playing ? "⏸ PAUSE" : lapIndex === 0 ? "▶ SIMULATE" : "▶ RESUME"}
              </button>
              <select
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                style={{background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--text)",
                  padding:"6px 10px",borderRadius:3,fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:12,letterSpacing:1,cursor:"pointer"}}
              >
                <option value={1000}>1× Speed</option>
                <option value={600}>2× Speed</option>
                <option value={250}>5× Speed</option>
                <option value={80}>10× Speed</option>
              </select>
            </div>
          </div>

          <Leaderboard lapData={lapData} lapIndex={lapIndex} totalLaps={totalLaps} />

          {/* Replay slider */}
          <div className="replay-bar">
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,color:"var(--muted)",letterSpacing:1}}>LAP 0</span>
            <input
              type="range" min={0} max={totalLaps} value={lapIndex}
              className="replay-slider"
              onChange={e => { setPlaying(false); setLapIndex(Number(e.target.value)); }}
            />
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,color:"var(--muted)",letterSpacing:1}}>LAP {totalLaps}</span>
          </div>
        </>
      ) : (
        <div className="highlights-grid">
          {hls.map((h, i) => (
            <div className="highlight-card" key={i}>
              <div className="hl-type" style={{color: h.color}}>
                <div className="hl-dot" style={{background: h.color}} />
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

// ── CALENDAR PAGE ─────────────────────────────────────────────────────────

function CalendarPage() {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "sprint"
    ? RACES_2026.filter(r => r.sprint)
    : RACES_2026;

  return (
    <div className="page">
      <div className="page-title">2026 Season Calendar</div>
      <div className="page-sub">24 GRAND PRIX · 6 SPRINT WEEKENDS · NEW ERA REGULATIONS</div>

      <div className="section-tabs" style={{marginBottom:20}}>
        <button className={`section-tab${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>All Races</button>
        <button className={`section-tab${filter === "sprint" ? " active" : ""}`} onClick={() => setFilter("sprint")}>Sprint Weekends</button>
      </div>

      <div className="calendar-grid">
        {filtered.map(race => {
          const days = race.status === "upcoming" ? daysUntil(race.month, race.day) : null;
          return (
            <div
              key={race.round}
              className={`race-card${race.status === "completed" ? " completed" : race.status === "next" ? " next" : ""}`}
            >
              <div className="card-round">
                <span>Round {race.round} · {race.status === "completed" ? "✓ Completed" : race.status === "next" ? "→ Next Race" : "Upcoming"}</span>
                {race.sprint && <span className="sprint-badge">SPRINT</span>}
              </div>
              <div className="card-name">{race.country} {race.name}</div>
              <div className="card-circuit">{race.circuit} · {race.city}</div>
              <div className="card-dates">
                <div className="card-date-block">
                  <span className="date-label">Friday</span>
                  <span className="date-val">{race.dates.fri}</span>
                </div>
                <div className="card-date-block">
                  <span className="date-label">Saturday</span>
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
                  <span className="countdown" style={{color:"var(--muted)"}}>In {days} days</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STANDINGS PAGE ────────────────────────────────────────────────────────

function StandingsPage() {
  const maxPts = STANDINGS[0].pts;
  return (
    <div className="page">
      <div className="page-title">Championship Standings</div>
      <div className="page-sub">AFTER ROUND 1 · AUSTRALIAN GRAND PRIX</div>

      <div className="leaderboard" style={{marginTop:20}}>
        <table className="standings-table">
          <thead>
            <tr>
              <th>POS</th>
              <th>DRIVER</th>
              <th>TEAM</th>
              <th>POINTS</th>
            </tr>
          </thead>
          <tbody>
            {STANDINGS.map((s, i) => {
              const driver = getDriver(s.id);
              const pct = maxPts > 0 ? (s.pts / maxPts) * 180 : 0;
              return (
                <tr key={s.id}>
                  <td>
                    <span className={`pos-num${i === 0 ? " p1" : i === 1 ? " p2" : i === 2 ? " p3" : ""}`}
                      style={{fontSize:16,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900}}>
                      {i + 1}
                    </span>
                  </td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:3,height:28,borderRadius:2,background:driver.color,flexShrink:0}} />
                      <div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:15}}>
                          {driver.flag} {driver.id}
                        </div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>{driver.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{color:"var(--muted)",fontSize:12}}>{driver.team}</td>
                  <td>
                    <div className="pts-bar-wrap">
                      <span className="pts-num">{s.pts}</span>
                      {s.pts > 0 && (
                        <div className="pts-bar" style={{width: pct, background: driver.color}} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("calendar");

  return (
    <>
      <style>{css}</style>
      <div className="f1-app">
        <nav className="nav">
          <div className="nav-logo">F1<span>TRACK</span></div>
          <div className="nav-tabs">
            <button className={`nav-tab${tab === "calendar" ? " active" : ""}`} onClick={() => setTab("calendar")}>
              Calendar
            </button>
            <button className={`nav-tab${tab === "race" ? " active" : ""}`} onClick={() => setTab("race")}>
              <span className="live-dot" />Race Tracker
            </button>
            <button className={`nav-tab${tab === "standings" ? " active" : ""}`} onClick={() => setTab("standings")}>
              Standings
            </button>
          </div>
        </nav>

        {tab === "calendar"  && <CalendarPage />}
        {tab === "race"      && <RaceTrackerPage />}
        {tab === "standings" && <StandingsPage />}
      </div>
    </>
  );
}
