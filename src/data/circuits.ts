// ─────────────────────────────────────────────────────────────────────────────
// F1TRACK — Circuit Database
// Contains track history, notable corners, stats, and layout image URLs
// Keyed by Jolpica API circuitId for easy lookup
// ─────────────────────────────────────────────────────────────────────────────

export interface NotableTurn {
  name: string;
  number: string;       // e.g. "1", "9-10", "Maggotts-Becketts"
  description: string;
}

export interface CircuitInfo {
  name: string;
  location: string;
  country: string;
  lengthKm: number;
  turns: number;
  lapRecord: string;          // e.g. "1:31.447 (Daniel Ricciardo, 2023)"
  firstGP: number;
  imageUrl: string;           // track layout image URL
  history: string;
  notableTurns: NotableTurn[];
}

/**
 * Comprehensive circuit database keyed by Jolpica circuitId.
 * Covers all circuits on the 2024–2026 F1 calendars.
 */
export const CIRCUITS: Record<string, CircuitInfo> = {
  // ── Albert Park ──────────────────────────────────────────────────────────
  albert_park: {
    name: "Albert Park Grand Prix Circuit",
    location: "Melbourne, Victoria",
    country: "Australia",
    lengthKm: 5.278,
    turns: 14,
    lapRecord: "1:20.235 (Charles Leclerc, 2024)",
    firstGP: 1996,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Australia_Circuit.webp",
    history: "Originally a street circuit through Melbourne's Albert Park, it became Australia's F1 home in 1996, replacing Adelaide. The circuit was significantly modified in 2022, removing chicanes and widening corners to promote overtaking. Set against the backdrop of a picturesque lake, it has produced numerous memorable races including the dramatic 1996 inaugural event won by Damon Hill.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "Fast right-hander into the braking zone — a prime overtaking opportunity at the start of the lap." },
      { name: "Turn 6", number: "6", description: "High-speed left kink introduced in the 2022 redesign, taken flat-out in qualifying trim." },
      { name: "Turn 11–12", number: "11-12", description: "Fast chicane sequence demanding precision; the new layout removed the old Turn 11 chicane creating a thrilling high-speed section." },
    ],
  },

  // ── Shanghai ─────────────────────────────────────────────────────────────
  shanghai: {
    name: "Shanghai International Circuit",
    location: "Shanghai",
    country: "China",
    lengthKm: 5.451,
    turns: 16,
    lapRecord: "1:32.238 (Michael Schumacher, 2004)",
    firstGP: 2004,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/China_Circuit.webp",
    history: "Designed by Hermann Tilke and opened in 2004, the Shanghai circuit features a distinctive layout inspired by the Chinese character 'shàng' (上), meaning 'above' or 'ascending'. The track has hosted numerous exciting races, with its long back straight providing excellent overtaking opportunities. The 2019 race marked the 1000th F1 World Championship race.",
    notableTurns: [
      { name: "Turns 1-2-3", number: "1-3", description: "A long, tightening right-hand spiral that decreases in radius — one of the most physically demanding corner sequences in F1." },
      { name: "Turn 6", number: "6", description: "Tricky hairpin with heavy braking, a key overtaking spot leading onto the short straight." },
      { name: "Turn 13", number: "13", description: "High-speed left-hander at the end of the back straight, requiring precise late braking for overtaking moves." },
    ],
  },

  // ── Suzuka ───────────────────────────────────────────────────────────────
  suzuka: {
    name: "Suzuka International Racing Course",
    location: "Suzuka, Mie Prefecture",
    country: "Japan",
    lengthKm: 5.807,
    turns: 18,
    lapRecord: "1:30.983 (Lewis Hamilton, 2019)",
    firstGP: 1987,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Japan_Circuit.webp",
    history: "One of the most revered circuits in motorsport, Suzuka is unique as the only figure-of-eight layout in F1, with an overpass where the track crosses itself. Built in 1962 by Honda as a test track, it became an F1 venue in 1987 and has been the stage for many championship-deciding moments, including Prost vs. Senna in 1989 and 1990, and Verstappen's 2022 title clincher.",
    notableTurns: [
      { name: "Esses (S Curves)", number: "3-7", description: "A legendary series of high-speed S-bends taken nearly flat-out, demanding perfect car balance and driver commitment — considered one of the greatest corner sequences in all of motorsport." },
      { name: "Degner Curves", number: "8-9", description: "Named after Ernst Degner, this pair of high-speed right-handers drops downhill under the overpass. Misjudgment often sends cars into the gravel." },
      { name: "130R", number: "15", description: "One of the fastest corners in F1, a left-hander taken at over 300 km/h. Despite being eased in 2003, it still demands absolute bravery." },
      { name: "Casio Triangle", number: "16-17", description: "A tight chicane before the main straight, crucial for exit speed and a common overtaking setup point." },
    ],
  },

  // ── Bahrain ──────────────────────────────────────────────────────────────
  bahrain: {
    name: "Bahrain International Circuit",
    location: "Sakhir",
    country: "Bahrain",
    lengthKm: 5.412,
    turns: 15,
    lapRecord: "1:31.447 (Pedro de la Rosa, 2005)",
    firstGP: 2004,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Bahrain_Circuit.webp",
    history: "The first F1 circuit in the Middle East, Bahrain International Circuit opened in 2004 and has become a season-opening staple. Set in the desert south of Manama, its dramatic floodlit night race (first held in 2014) creates a spectacular visual atmosphere. The circuit hosted two races in 2020 during COVID, with the second using an alternative 'Outer' layout.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "Tight right-hander after a long straight — the prime overtaking opportunity with heavy braking from 320+ km/h." },
      { name: "Turn 4", number: "4", description: "A 90-degree left-hander that opens up the fast middle sector. Traction out of here is critical for lap time." },
      { name: "Turn 10", number: "10", description: "A fast, sweeping right-hander that leads into the technical final sector. Demands confidence and clean car balance." },
    ],
  },

  // ── Jeddah ───────────────────────────────────────────────────────────────
  jeddah: {
    name: "Jeddah Corniche Circuit",
    location: "Jeddah",
    country: "Saudi Arabia",
    lengthKm: 6.174,
    turns: 27,
    lapRecord: "1:30.734 (Lewis Hamilton, 2021)",
    firstGP: 2021,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Saudi_Arabia_Circuit.webp",
    history: "The fastest street circuit in F1 history, the Jeddah Corniche Circuit debuted in 2021 along the Red Sea waterfront. With an average speed exceeding 250 km/h and 27 corners through narrow barriers, it's one of the most challenging and dangerous circuits on the calendar. The 2021 inaugural race was one of the most chaotic in F1 history, featuring red flags, penalties, and a controversial battle between Hamilton and Verstappen.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "Flat-out right-hander between concrete walls, setting the tone for this high-speed street circuit." },
      { name: "Turn 13–14", number: "13-14", description: "A fast left-right combination on the seafront section, taken at incredibly high speed with walls inches from the car." },
      { name: "Turn 22–23", number: "22-23", description: "The most dramatic section — a near-blind, high-speed left-right with limited visibility, demanding total commitment." },
    ],
  },

  // ── Miami ────────────────────────────────────────────────────────────────
  miami: {
    name: "Miami International Autodrome",
    location: "Miami Gardens, Florida",
    country: "USA",
    lengthKm: 5.412,
    turns: 19,
    lapRecord: "1:29.708 (Max Verstappen, 2023)",
    firstGP: 2022,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Miami_Circuit.webp",
    history: "Built around the Hard Rock Stadium in Miami Gardens, this semi-permanent circuit debuted in 2022 and quickly became one of F1's showpiece events. The track features a mix of high-speed straights and tight corners, with a fake marina and beach club creating a unique atmosphere. The first Sprint race at Miami in 2023 was won by Sergio Pérez.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "A heavy braking zone into a tight right-hander — the best overtaking opportunity on the circuit." },
      { name: "Turn 7", number: "7", description: "A fast, sweeping left-hander that tests cornering speed and car balance through the stadium section." },
      { name: "Turn 17", number: "17", description: "Tight chicane before the back straight, crucial for getting a good exit speed to set up overtaking moves." },
    ],
  },

  // ── Circuit Gilles Villeneuve ────────────────────────────────────────────
  villeneuve: {
    name: "Circuit Gilles Villeneuve",
    location: "Montréal, Quebec",
    country: "Canada",
    lengthKm: 4.361,
    turns: 14,
    lapRecord: "1:13.078 (Valtteri Bottas, 2019)",
    firstGP: 1978,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Canada_Circuit.webp",
    history: "Located on the man-made Île Notre-Dame in the St. Lawrence River, this circuit is named after the legendary Canadian driver who won the first race here in 1978. Known for producing dramatic and unpredictable races, the track features long straights connected by tight chicanes, making car setup a compromise between top speed and downforce. The 2011 Canadian GP, won by Jenson Button after starting last, is often regarded as the greatest F1 race ever.",
    notableTurns: [
      { name: "Turn 1-2 (Virage Senna)", number: "1-2", description: "Named after Ayrton Senna, this tight chicane at the end of the pit straight is a frequent first-lap incident zone." },
      { name: "Turn 6-7 (L'Epingle)", number: "6-7", description: "The famous hairpin — the slowest point on track and a prime overtaking zone with heavy braking." },
      { name: "Wall of Champions", number: "13-14", description: "The final chicane exits right next to a concrete wall. It earned its name after claiming Damon Hill, Michael Schumacher, and Jacques Villeneuve in 1999." },
    ],
  },

  // ── Monaco ───────────────────────────────────────────────────────────────
  monaco: {
    name: "Circuit de Monaco",
    location: "Monte Carlo",
    country: "Monaco",
    lengthKm: 3.337,
    turns: 19,
    lapRecord: "1:12.909 (Lewis Hamilton, 2021)",
    firstGP: 1950,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Monaco_Circuit.webp",
    history: "The jewel in F1's crown, the Monaco Grand Prix has been held since 1929 and joined the F1 World Championship in 1950. Racing through the narrow streets of Monte Carlo with Armco barriers inches away, it's the ultimate test of precision and concentration. While overtaking is notoriously difficult, qualifying is supreme — Ayrton Senna holds the record with 6 victories here. The race remains the most prestigious event in motorsport.",
    notableTurns: [
      { name: "Sainte Dévote", number: "1", description: "The uphill right-hander after the start/finish straight is a classic first-lap bottleneck with cars funneling into the narrow corner." },
      { name: "Casino Square", number: "4", description: "A glamorous left-hander in front of the famous Monte Carlo Casino, cresting a hill with limited visibility on approach." },
      { name: "Grand Hotel Hairpin", number: "6", description: "The slowest corner in all of F1 (approximately 50 km/h), the famous Fairmont hairpin requires extreme lock and precision." },
      { name: "Swimming Pool", number: "13-14", description: "A fast chicane next to the swimming pool complex, demanding millimeter precision between the barriers at high speed." },
      { name: "Rascasse", number: "18", description: "The tight left-hander leading onto the main straight. Michael Schumacher infamously parked here during 2006 qualifying." },
    ],
  },

  // ── Barcelona-Catalunya ──────────────────────────────────────────────────
  catalunya: {
    name: "Circuit de Barcelona-Catalunya",
    location: "Montmeló, Barcelona",
    country: "Spain",
    lengthKm: 4.657,
    turns: 14,
    lapRecord: "1:16.330 (Max Verstappen, 2023)",
    firstGP: 1991,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Spain_Circuit.webp",
    history: "Home to pre-season testing for decades, Barcelona-Catalunya is one of the most well-known circuits among teams and drivers. Its variety of corner types makes it an excellent benchmark for car development. The circuit hosted the famous Mansell–Senna battle in 1991 and Verstappen's maiden victory in 2016 at age 18. The Turn 10 layout was changed in 2023 to promote overtaking.",
    notableTurns: [
      { name: "Turn 1 (Elf)", number: "1", description: "A fast, downhill right-hander providing a strong overtaking opportunity into the first braking zone." },
      { name: "Turn 3 (Renault)", number: "3", description: "A fast right-hander leading into the technical middle sector. Getting this right is crucial for overall lap time." },
      { name: "Turn 5 (Seat)", number: "5", description: "The famous slow chicane, a key overtaking zone at the end of the long back straight. Often a scene of first-lap drama." },
    ],
  },

  // ── Red Bull Ring ────────────────────────────────────────────────────────
  red_bull_ring: {
    name: "Red Bull Ring",
    location: "Spielberg, Styria",
    country: "Austria",
    lengthKm: 4.318,
    turns: 10,
    lapRecord: "1:05.619 (Carlos Sainz, 2020)",
    firstGP: 1970,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Austria_Circuit.webp",
    history: "Nestled in the Styrian mountains, this short but dramatic circuit has hosted F1 under various names — Österreichring (1970–1987), A1-Ring (1997–2003), and Red Bull Ring (2014–present). Despite having only 10 corners, the combination of elevation changes, heavy braking zones, and uphill straights produces exciting racing. It became the site of F1's COVID-era restart in 2020.",
    notableTurns: [
      { name: "Turn 1 (Niki Lauda)", number: "1", description: "A sharp uphill right-hander after the pit straight with heavy braking — the prime overtaking spot on the circuit." },
      { name: "Turn 3", number: "3", description: "Uphill right-hander cresting a rise with limited visibility. A DRS detection point that sets up moves into Turn 4." },
      { name: "Turn 4 (Schlossgold)", number: "4", description: "A heavy braking zone into a downhill right-hander — the second major overtaking opportunity on the lap." },
    ],
  },

  // ── Silverstone ──────────────────────────────────────────────────────────
  silverstone: {
    name: "Silverstone Circuit",
    location: "Silverstone, Northamptonshire",
    country: "UK",
    lengthKm: 5.891,
    turns: 18,
    lapRecord: "1:27.097 (Max Verstappen, 2020)",
    firstGP: 1950,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Great_Britain_Circuit.webp",
    history: "The birthplace of Formula 1 — Silverstone hosted the very first World Championship race on May 13, 1950. Built on a former WWII airfield, it retains high-speed characteristics that make it one of the fastest circuits on the calendar. The Maggotts-Becketts-Chapel complex is considered one of the greatest sequences of corners in motorsport. Lewis Hamilton has won a record 8 British GPs here.",
    notableTurns: [
      { name: "Copse", number: "9", description: "A fast, sweeping right-hander taken at 280+ km/h, demanding huge commitment. Scene of the famous Hamilton–Verstappen collision in 2021." },
      { name: "Maggotts–Becketts–Chapel", number: "11-13", description: "The crown jewel — a breathtaking left-right-left-right high-speed sequence that is one of the ultimate tests of a driver's skill and car's aerodynamic balance." },
      { name: "Stowe", number: "15", description: "A fast right-hander at the end of the Hangar Straight, providing a key overtaking opportunity with heavy braking." },
    ],
  },

  // ── Spa-Francorchamps ────────────────────────────────────────────────────
  spa: {
    name: "Circuit de Spa-Francorchamps",
    location: "Stavelot, Wallonia",
    country: "Belgium",
    lengthKm: 7.004,
    turns: 19,
    lapRecord: "1:46.286 (Valtteri Bottas, 2018)",
    firstGP: 1950,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Belgium_Circuit.webp",
    history: "The longest and one of the most iconic circuits in F1, Spa-Francorchamps winds through the forests of the Belgian Ardennes. Known for its unpredictable weather where one section can be dry while another is drenched in rain, it rewards brave, committed driving. The circuit has been a championship fixture since 1950 (with gaps) and is universally loved by drivers. It hosted the tragic 2019 F2 race where Anthoine Hubert lost his life.",
    notableTurns: [
      { name: "La Source", number: "1", description: "A tight hairpin at the top of the hill, the first braking zone and a common site for opening-lap contact." },
      { name: "Eau Rouge–Raidillon", number: "3-4", description: "The most famous corner combination in F1. A dramatic downhill-then-uphill left-right taken flat out at 300+ km/h — an ultimate test of bravery and car stability." },
      { name: "Pouhon", number: "10-11", description: "A long, double-apex left-hander taken at high speed, generating massive G-forces and demanding perfect car balance." },
      { name: "Blanchimont", number: "17", description: "A very fast left-hand kink approaching 320 km/h — any mistake sends cars straight into the barriers." },
    ],
  },

  // ── Hungaroring ──────────────────────────────────────────────────────────
  hungaroring: {
    name: "Hungaroring",
    location: "Mogyoród, Budapest",
    country: "Hungary",
    lengthKm: 4.381,
    turns: 14,
    lapRecord: "1:16.627 (Lewis Hamilton, 2020)",
    firstGP: 1986,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Hungary_Circuit.webp",
    history: "The first F1 circuit behind the Iron Curtain, the Hungaroring hosted its first race in 1986. The tight, twisty layout set in a natural valley amphitheatre is often compared to 'Monaco without walls'. Overtaking is notoriously difficult, making strategy and qualifying crucial. Notable races include Damon Hill's stunning wet-weather victory in 1997 and Hamilton's record eighth win here in 2020.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "A sharp right-hander at the bottom of the hill after the start/finish straight — the primary overtaking opportunity." },
      { name: "Turn 4", number: "4", description: "A fast, sweeping left-right downhill section into a tight hairpin, requiring strong braking and a good line." },
      { name: "Turn 11-12", number: "11-12", description: "A tricky chicane complex where exit speed is crucial for the run down to the final corners." },
    ],
  },

  // ── Zandvoort ────────────────────────────────────────────────────────────
  zandvoort: {
    name: "Circuit Zandvoort",
    location: "Zandvoort, North Holland",
    country: "Netherlands",
    lengthKm: 4.259,
    turns: 14,
    lapRecord: "1:11.097 (Lewis Hamilton, 2021)",
    firstGP: 1952,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Netherlands_Circuit.webp",
    history: "Set in the sand dunes along the North Sea coast, Zandvoort returned to the F1 calendar in 2021 after a 36-year absence, fueled by Max Verstappen's popularity. The modernized circuit retained its old-school character with banked corners (turns 3 and 14) and undulating terrain. The narrow layout makes overtaking extremely difficult, but the atmosphere created by the Dutch fans is unmatched.",
    notableTurns: [
      { name: "Tarzanbocht (Turn 1)", number: "1", description: "A tight right-hander with heavy braking — the only realistic overtaking point on this narrow circuit." },
      { name: "Hugenholtz (Turn 3)", number: "3", description: "A banked corner (18° banking) allowing drivers to carry more speed through the turn, inspired by NASCAR-style oval banking." },
      { name: "Arie Luyendykbocht (Turn 14)", number: "14", description: "The final banked corner (19° banking), sweeping drivers back onto the main straight at high speed for a dramatic finish to the lap." },
    ],
  },

  // ── Monza ────────────────────────────────────────────────────────────────
  monza: {
    name: "Autodromo Nazionale Monza",
    location: "Monza, Lombardy",
    country: "Italy",
    lengthKm: 5.793,
    turns: 11,
    lapRecord: "1:21.046 (Rubens Barrichello, 2004)",
    firstGP: 1950,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Italy_Circuit.webp",
    history: "The 'Temple of Speed' — Monza has been hosting races since 1922 and has been on the F1 calendar since the inaugural 1950 season. Known for its low-downforce, ultra-high-speed characteristics, it regularly produces the fastest average race speeds of the season. The Tifosi (Ferrari's passionate fans) create a unique atmosphere, and a Ferrari victory here sends the whole park into euphoria. The 2020 race saw Pierre Gasly's shock maiden victory.",
    notableTurns: [
      { name: "Turn 1-2 (Variante del Rettifilo)", number: "1-2", description: "The first chicane after the long start/finish straight — F1's most famous braking zone, notorious for first-lap pile-ups." },
      { name: "Curva Grande", number: "4", description: "A long, fast right-hander taken at 280+ km/h, requiring bravery and aerodynamic stability." },
      { name: "Lesmo 1 & 2", number: "5-6", description: "Two fast right-handers through the trees, demanding precision. Any mistake here can ruin the lap through the Ascari chicane." },
      { name: "Curva Parabolica (Alboreto)", number: "11", description: "The famous final corner — a long, opening right-hander where exit speed is crucial for the run to the line." },
    ],
  },

  // ── Baku ─────────────────────────────────────────────────────────────────
  baku: {
    name: "Baku City Circuit",
    location: "Baku",
    country: "Azerbaijan",
    lengthKm: 6.003,
    turns: 20,
    lapRecord: "1:43.009 (Charles Leclerc, 2019)",
    firstGP: 2016,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Baku_Circuit.webp",
    history: "One of F1's most dramatic venues, the Baku City Circuit winds through the old city streets past medieval walls and modern skyscrapers. The 2.2km main straight is the longest in F1, producing top speeds over 350 km/h. Since its debut as the European Grand Prix in 2016, Baku has delivered some of the most chaotic and unpredictable races in F1 history, including the wild 2017 and 2021 editions.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "A 90-degree left-hander after heavy braking from the main straight — the prime overtaking zone with frequent lock-ups." },
      { name: "Turn 8 (Castle)", number: "8", description: "The circuit's signature corner — a 90-degree left next to the medieval castle walls, incredibly tight with zero margin for error." },
      { name: "Turn 15", number: "15", description: "A fast kink between barriers at the start of the 2.2km straight. Slight contact here has dramatic consequences at 320+ km/h." },
    ],
  },

  // ── Marina Bay ───────────────────────────────────────────────────────────
  marina_bay: {
    name: "Marina Bay Street Circuit",
    location: "Marina Bay, Singapore",
    country: "Singapore",
    lengthKm: 4.940,
    turns: 19,
    lapRecord: "1:35.867 (Lewis Hamilton, 2023)",
    firstGP: 2008,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Singapore_Circuit.webp",
    history: "F1's first night race, Marina Bay debuted in 2008 and is arguably the most physically demanding race on the calendar. The humidity, two-hour race duration, and bumpy street surface push drivers to their limits. The stunning backdrop of Singapore's illuminated skyline makes it one of the most visually spectacular events in F1. The 2008 inaugural race was controversially won by Fernando Alonso in the 'Crashgate' scandal.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "Tight left-hander after a short straight between barriers — first-lap contact is almost inevitable." },
      { name: "Turn 5 (Singapore Sling)", number: "5", description: "A tricky chicane that was redesigned multiple times. Gets cars through a tight section near the Anderson Bridge." },
      { name: "Turn 14", number: "14", description: "Sharp left-hander next to the Singapore Flyer, one of the best overtaking opportunities outside of Turn 1." },
    ],
  },

  // ── Circuit of the Americas ──────────────────────────────────────────────
  americas: {
    name: "Circuit of the Americas",
    location: "Austin, Texas",
    country: "USA",
    lengthKm: 5.513,
    turns: 20,
    lapRecord: "1:36.169 (Charles Leclerc, 2019)",
    firstGP: 2012,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/USA_Circuit.webp",
    history: "Purpose-built for F1, COTA opened in 2012 and is inspired by the world's best corners — its Turn 1 climb echoes the approach to Becketts at Silverstone, while its multi-apex Esses recall Suzuka's S Curves. The dramatic 40-meter elevation change at Turn 1 is one of F1's most iconic visuals. Lewis Hamilton has an outstanding record here, winning five of the first seven US GPs at the circuit.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "A dramatic uphill left-hander with a 40-meter climb — blind over the crest. The best overtaking spot and scene of many epic battles." },
      { name: "Esses (Turns 3-6)", number: "3-6", description: "A flowing high-speed S-curve section inspired by Silverstone's Maggotts-Becketts, taken at full throttle by the bravest drivers." },
      { name: "Turn 12", number: "12", description: "A tight hairpin at the end of the back straight — perfect for late-braking overtaking maneuvers." },
    ],
  },

  // ── Autodromo Hermanos Rodriguez ─────────────────────────────────────────
  rodriguez: {
    name: "Autódromo Hermanos Rodríguez",
    location: "Mexico City",
    country: "Mexico",
    lengthKm: 4.304,
    turns: 17,
    lapRecord: "1:17.774 (Valtteri Bottas, 2021)",
    firstGP: 1963,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Mexico_Circuit.webp",
    history: "Named after the Rodríguez brothers (Pedro and Ricardo), this circuit sits at 2,285m altitude — the highest on the F1 calendar. The thin air reduces engine power by about 20% and makes cooling a major challenge. The circuit fell off the calendar after 1992 but returned in 2015 to enormous enthusiasm. Its stadium section (Foro Sol) where fans pack into a baseball stadium creates one of F1's most electric atmospheres.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "A long braking zone into a tight right-hander — a prime overtaking spot where cars can run side by side." },
      { name: "Peraltada (Turns 12-13)", number: "12-13", description: "The remnant of the old banked Peraltada, now split into a fast sweeping section that leads into the stadium." },
      { name: "Foro Sol (Turns 14-16)", number: "14-16", description: "The stadium section through the former baseball ground — incredibly tight turns with massive crowds creating an amphitheatre of noise." },
    ],
  },

  // ── Interlagos ───────────────────────────────────────────────────────────
  interlagos: {
    name: "Autódromo José Carlos Pace",
    location: "São Paulo",
    country: "Brazil",
    lengthKm: 4.309,
    turns: 15,
    lapRecord: "1:10.540 (Valtteri Bottas, 2018)",
    firstGP: 1973,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Brazil_Circuit.webp",
    history: "One of the anti-clockwise circuits on the calendar, Interlagos is set between two reservoirs (hence 'between lakes') in São Paulo. The undulating layout with its dramatic elevation changes has produced some of the greatest F1 moments — Senna's emotional 1991 home victory, Räikkönen's last-to-first surge in 2006, and Vettel's tearful 2012 title clincher. The unpredictable weather adds another layer of drama.",
    notableTurns: [
      { name: "Senna S (Turns 1-2)", number: "1-2", description: "Named after Ayrton Senna, this fast downhill left-right at the start is one of the most exciting opening corners in F1." },
      { name: "Descida do Lago (Turn 4)", number: "4", description: "A dramatic downhill plunge at high speed, compression at the bottom loading the car before the braking zone." },
      { name: "Junção (Turn 12)", number: "12", description: "The 'junction' — a long left-hander where exit speed determines pace up the long uphill run to the start/finish line." },
    ],
  },

  // ── Las Vegas ────────────────────────────────────────────────────────────
  las_vegas: {
    name: "Las Vegas Strip Circuit",
    location: "Las Vegas, Nevada",
    country: "USA",
    lengthKm: 6.201,
    turns: 17,
    lapRecord: "1:35.490 (Oscar Piastri, 2024)",
    firstGP: 2023,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Las_Vegas_Circuit.webp",
    history: "F1's return to Las Vegas in 2023 was one of the most anticipated events in recent history. The circuit winds past the famous Strip with its iconic hotels and casinos, racing under the neon lights at night. The inaugural 2023 race exceeded expectations with thrilling racing and Verstappen taking victory. The 1.9km main straight, one of the longest in F1, produces immense top speeds exceeding 340 km/h.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "A high-speed right-hander at the end of the Strip straight — the primary overtaking zone after a 340 km/h approach." },
      { name: "Turn 5", number: "5", description: "A 90-degree left-hander into the hotel section, requiring precise braking between the barriers." },
      { name: "Turn 14", number: "14", description: "A fast right-hander back onto the Strip, where drivers can set up DRS for the massive 1.9km straight." },
    ],
  },

  // ── Losail ───────────────────────────────────────────────────────────────
  losail: {
    name: "Lusail International Circuit",
    location: "Lusail",
    country: "Qatar",
    lengthKm: 5.419,
    turns: 16,
    lapRecord: "1:24.319 (Max Verstappen, 2023)",
    firstGP: 2021,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Qatar_Circuit.webp",
    history: "Originally built for MotoGP, the Lusail circuit in Qatar debuted in F1 in 2021 and became a permanent fixture in 2023 with significant modifications. The floodlit desert circuit features long straights and many medium-speed corners. The extreme heat and humidity of Qatar make it one of the most physically demanding races. The 2023 race saw multiple drivers suffer from dehydration and heat exhaustion.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "A fast right-hander after the main straight — the primary braking zone and overtaking opportunity." },
      { name: "Turn 6", number: "6", description: "A long, double-apex left-hander that puts immense lateral load on the right-side tires." },
      { name: "Turn 12-13", number: "12-13", description: "A fast left-right combination that demands precision and was the site of several curb-related tire failures in 2023." },
    ],
  },

  // ── Yas Marina ───────────────────────────────────────────────────────────
  yas_marina: {
    name: "Yas Marina Circuit",
    location: "Abu Dhabi",
    country: "UAE",
    lengthKm: 5.281,
    turns: 16,
    lapRecord: "1:26.103 (Max Verstappen, 2021)",
    firstGP: 2009,
    imageUrl: "https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Abu_Dhabi_Circuit.webp",
    history: "The traditional season-finale venue since 2009, Yas Marina is a state-of-the-art facility on Yas Island. The circuit passes through the iconic Yas Hotel and transitions from daylight to floodlights during the twilight race. It was significantly redesigned in 2021 to improve racing, and that same year hosted the most controversial F1 finish ever — Hamilton vs. Verstappen on the final lap after a late safety car.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "A heavy braking zone from 340 km/h into a tight left-hander — the main overtaking spot, redesigned in 2021 for closer racing." },
      { name: "Turn 5-6-7", number: "5-7", description: "A flowing left-right-left section replacing the old chicane, allowing cars to follow more closely." },
      { name: "Turn 9 (Hotel Section)", number: "9", description: "The signature corner passing underneath the Yas Hotel — a unique visual landmark and a tricky left-hander." },
    ],
  },

  // ── Madrid (New for 2026) ────────────────────────────────────────────────
  madrid: {
    name: "Circuito de Madrid IFEMA",
    location: "Madrid",
    country: "Spain",
    lengthKm: 5.473,
    turns: 20,
    lapRecord: "TBD (New circuit for 2026)",
    firstGP: 2026,
    imageUrl: "",
    history: "A brand-new circuit built around the IFEMA convention center in Madrid, set to debut on the F1 calendar in 2026. Designed to be a modern Grade 1 circuit with sustainability in mind, it aims to bring the Spanish Grand Prix to the capital. The circuit layout features a mix of high-speed sections and technical zones, with significant elevation changes providing additional challenge. It will be Spain's second F1 venue alongside Barcelona.",
    notableTurns: [
      { name: "Turn 1", number: "1", description: "A fast right-hander after the main straight — expected to be the primary overtaking zone." },
      { name: "Turns 7-9", number: "7-9", description: "A technical section with elevation changes through the IFEMA complex, demanding precise car placement." },
      { name: "Turn 16", number: "16", description: "A heavy braking zone into a tight hairpin, providing a secondary overtaking opportunity." },
    ],
  },
};

// ── Lookup Helper ────────────────────────────────────────────────────────────

/**
 * Find circuit info by Jolpica circuitId, or by fuzzy matching circuit name.
 */
export function getCircuitInfo(circuitId?: string, circuitName?: string): CircuitInfo | null {
  if (circuitId && CIRCUITS[circuitId]) {
    return CIRCUITS[circuitId];
  }

  // Fuzzy match by name
  if (circuitName) {
    const lower = circuitName.toLowerCase();
    for (const info of Object.values(CIRCUITS)) {
      if (info.name.toLowerCase().includes(lower) || lower.includes(info.name.toLowerCase())) {
        return info;
      }
    }
    // Match on location
    for (const info of Object.values(CIRCUITS)) {
      if (info.location.toLowerCase().includes(lower) || lower.includes(info.location.toLowerCase())) {
        return info;
      }
    }
  }

  return null;
}
