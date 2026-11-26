import { HotspotRecord, calculateDistanceMeters, latLngToCell } from '@/lib/h3-utils';

export type TargetPlatform = 'both' | 'uber' | 'didi';

export interface LiveWeatherSignal {
  temperatureC: number | null;
  precipitationMm: number;
  windSpeedKmh: number;
  weatherCode: number;
  conditionLabel: string;
  weatherMultiplier: number;
  timezone: string;
  localTimeIso: string;
}

export interface LivePoiSignal {
  name: string;
  category: 'airport' | 'transit' | 'mall' | 'hospital' | 'university' | 'stadium' | 'nightlife' | 'hotel' | 'business' | 'hotspot';
  lat: number;
  lng: number;
  distanceKm: number;
  estDriveMins: number;
  uberFit: number; // 0-100
  didiFit: number; // 0-100
  projectedMultiplier: number;
  netProfitScore: number;
  whyNow: string;
  stagingTip: string;
  avoidWarning: string;
  timeWindow: string;
  bestPlatform: 'Uber' | 'DiDi' | 'Uber + DiDi';
  sourceTag: string;
}

export interface AIRecommendation {
  rank: number;
  locationName: string;
  zone: string;
  lat: number;
  lng: number;
  h3Index: string;
  recommendedPlatform: 'Uber' | 'DiDi' | 'Uber + DiDi';
  estimatedSurge: string;
  confidencePct: number;
  distanceKm: number;
  driveTimeMins: number;
  whyNow: string;
  stagingAdvice: string;
  timeWindow: string;
  cautionTip: string;
  estimatedEarningsBoost: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AIInsightsResponse {
  ok: boolean;
  engine: 'gemini-grounded' | 'gemini-direct' | 'telemetry-engine';
  generatedAt: string;
  driverArea: string;
  localTimeLabel: string;
  weather: LiveWeatherSignal;
  platformFocus: TargetPlatform;
  headlineAdvice: string;
  platformStrategy: {
    uber: string;
    didi: string;
  };
  avoidAlert: string;
  recommendations: AIRecommendation[];
  groundingSources: GroundingSource[];
  signalsUsed: {
    weatherLive: boolean;
    osmPoisCount: number;
    liveFlightsCount: number;
    radarHotspotsCount: number;
  };
}

interface MetroCorridor {
  name: string;
  zone: string;
  category: LivePoiSignal['category'];
  lat: number;
  lng: number;
  uberBias: number;
  didiBias: number;
  peakHours: number[]; // 0-23 local hour
  weekendBoost: boolean;
  stagingTip: string;
  avoidWarning: string;
  reasonTemplate: string;
}

const CAIRO_CORRIDORS: MetroCorridor[] = [
  {
    name: 'Cairo International Airport — Terminal 3 Arrivals',
    zone: 'Heliopolis / Airport Hub',
    category: 'airport',
    lat: 30.1219,
    lng: 31.4056,
    uberBias: 96,
    didiBias: 74,
    peakHours: [0, 1, 2, 3, 4, 5, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    weekendBoost: true,
    stagingTip: 'Wait along El-Orouba / Terminal 3 service loop or catch drop-off rematches instead of deep queue parking if lot is saturated.',
    avoidWarning: 'Avoid entering the T3 waiting lot if Uber queue exceeds 45 drivers; target arriving widebody waves.',
    reasonTemplate: 'High-ticket long-distance airport fares (Maadi, Zamalek, New Cairo, Zayed) with strong Uber Comfort & surge multipliers.',
  },
  {
    name: 'Cairo International Airport — Terminal 2 International',
    zone: 'Heliopolis / Airport T2',
    category: 'airport',
    lat: 30.1190,
    lng: 31.4010,
    uberBias: 94,
    didiBias: 72,
    peakHours: [0, 1, 2, 3, 4, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    weekendBoost: true,
    stagingTip: 'Position near Terminal 2 Arrivals Gate B exit lane right as Gulf/European flights clear baggage claim (25–35 min post-landing).',
    avoidWarning: 'Watch for empty return loops after 03:30 AM unless a late Saudi/UAE flight is landing.',
    reasonTemplate: 'International Gulf & European arrivals heavily favor Uber with premium trip values.',
  },
  {
    name: 'Sphinx International Airport (SPX)',
    zone: 'West Cairo / Sheikh Zayed Corridor',
    category: 'airport',
    lat: 30.1147,
    lng: 30.8992,
    uberBias: 93,
    didiBias: 78,
    peakHours: [1, 2, 3, 6, 7, 17, 18, 19, 20, 21, 22, 23],
    weekendBoost: true,
    stagingTip: 'Stage near SPX outer roundabout 15 mins before low-cost European/Gulf arrivals clear customs.',
    avoidWarning: 'Low driver supply causes high surges, but verify flight arrival time before driving >15 km.',
    reasonTemplate: 'Very scarce driver supply near SPX triggers immediate extreme multipliers for Pyramids/Zamalek/Zayed trips.',
  },
  {
    name: 'Zamalek — 26th of July & Brazil St.',
    zone: 'Zamalek Island',
    category: 'nightlife',
    lat: 30.0609,
    lng: 31.2197,
    uberBias: 92,
    didiBias: 82,
    peakHours: [13, 14, 15, 19, 20, 21, 22, 23, 0, 1, 2, 3],
    weekendBoost: true,
    stagingTip: 'Cruise Brazil St. or Abu El-Feda Nile edge; keep trips inside Zamalek/Downtown/Garden City or toward Maadi/New Cairo.',
    avoidWarning: 'Stay off 26th of July Corridor bridge bottlenecks during 16:00–19:30 rush.',
    reasonTemplate: 'Dense upscale dining, embassies, and late-night venues drive frequent Uber Comfort & high-multiplier pings.',
  },
  {
    name: 'New Cairo — Cairo Festival City & 90th St.',
    zone: 'Fifth Settlement / New Cairo',
    category: 'mall',
    lat: 30.0297,
    lng: 31.4077,
    uberBias: 90,
    didiBias: 84,
    peakHours: [8, 9, 10, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1],
    weekendBoost: true,
    stagingTip: 'Stage on South 90th service lane near CFC Mall Gate 4 or Point 90 / AUC gates depending on hour.',
    avoidWarning: 'Avoid deep inside mall underground pickup loops at closing time (23:30–00:30) due to exit gridlock.',
    reasonTemplate: 'Corporate offices by day and mega-mall/dining outflows until 01:00 AM create consistent high-fare rides.',
  },
  {
    name: 'Nasr City — Citystars & Abbas El-Akkad',
    zone: 'Nasr City',
    category: 'mall',
    lat: 30.0729,
    lng: 31.3461,
    uberBias: 82,
    didiBias: 94,
    peakHours: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0],
    weekendBoost: true,
    stagingTip: 'Stage on Omar Ibn El-Khattab St. outside Citystars Gate 1 or Abbas El-Akkad side streets for rapid DiDi pings.',
    avoidWarning: 'Avoid getting stuck on El-Nasr Road during stadium/exhibition exit jams without surge.',
    reasonTemplate: 'Highest continuous urban trip velocity on DiDi + Uber with low deadhead times and fast quest completion.',
  },
  {
    name: 'Downtown Tahrir & Ramses Transit Hub',
    zone: 'Central Cairo',
    category: 'transit',
    lat: 30.0561,
    lng: 31.2422,
    uberBias: 80,
    didiBias: 92,
    peakHours: [6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    weekendBoost: false,
    stagingTip: 'Position near Ramses Station perimeter / Abdel Moneim Riad square for intercity train arrivals with luggage.',
    avoidWarning: 'Avoid Talaat Harb pedestrian choke points; pick up on Corniche or Ramses outer lanes.',
    reasonTemplate: 'Steady rail/metro commuter arrivals and late-night travelers needing immediate rides across Greater Cairo.',
  },
  {
    name: 'Maadi — Degla & Road 9 Expat Hub',
    zone: 'Maadi',
    category: 'nightlife',
    lat: 29.9602,
    lng: 31.2667,
    uberBias: 88,
    didiBias: 83,
    peakHours: [7, 8, 9, 14, 15, 16, 19, 20, 21, 22, 23, 0, 1],
    weekendBoost: true,
    stagingTip: 'Stage near Road 9 cafes / Victoria Square or Degla Street 233 for high-rated, low-cancellation rides.',
    avoidWarning: 'Be selective on Corniche El-Nil southbound if Ring Road interchange is backed up.',
    reasonTemplate: 'High expat/corporate rider density with strong Uber demand and outbound airport/Zamalek trips.',
  },
  {
    name: 'Mohandessin & Dokki — Lebanon Sq. / Gameat El-Dewal',
    zone: 'Giza / Mohandessin',
    category: 'business',
    lat: 30.0581,
    lng: 31.2022,
    uberBias: 83,
    didiBias: 93,
    peakHours: [8, 9, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1],
    weekendBoost: true,
    stagingTip: 'Stage along Gameat El-Dewal El-Arabia or Syria St. intersections; flip DiDi + Uber simultaneously.',
    avoidWarning: 'Avoid 15th of May Bridge entry ramps at peak commute unless multiplier >= 1.5x.',
    reasonTemplate: 'Dense 24/7 commercial, clinic, and dining activity makes DiDi quest stacking and Uber surges highly lucrative.',
  },
  {
    name: 'Sheikh Zayed — Arkan Plaza & Mall of Arabia',
    zone: 'Sheikh Zayed / 6th October',
    category: 'mall',
    lat: 30.0195,
    lng: 30.9748,
    uberBias: 93,
    didiBias: 80,
    peakHours: [8, 9, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2],
    weekendBoost: true,
    stagingTip: 'Stage along Zayed Central Axis outside Arkan Plaza / Capital Business Park for high-ticket rides back into Cairo.',
    avoidWarning: 'Avoid driving empty deep into 6th of October industrial zones late at night.',
    reasonTemplate: 'Affluent dining/business hub with frequent long-distance return fares to Zamalek, New Cairo, and airports.',
  },
  {
    name: 'Smart Village Business Park',
    zone: 'Cairo-Alex Desert Rd',
    category: 'business',
    lat: 30.0713,
    lng: 31.0172,
    uberBias: 91,
    didiBias: 84,
    peakHours: [7, 8, 9, 16, 17, 18, 19],
    weekendBoost: false,
    stagingTip: 'Stage near Smart Village Gate 1 / 25 Axis exit at 16:30–18:30 Sun–Thu for corporate shift outflows.',
    avoidWarning: 'Quiet after 20:00 and on Fri–Sat weekends; pivot to Sheikh Zayed / Arkan instead.',
    reasonTemplate: 'Concentrated multinational corporate shift exits drive rapid multi-kilometer commuter surges.',
  },
  {
    name: 'Heliopolis — Korba & Tivoli Dome',
    zone: 'Heliopolis',
    category: 'nightlife',
    lat: 30.0911,
    lng: 31.3292,
    uberBias: 86,
    didiBias: 89,
    peakHours: [12, 13, 18, 19, 20, 21, 22, 23, 0, 1, 2],
    weekendBoost: true,
    stagingTip: 'Stage near Baghdad St. (Korba) or Almaza City Centre for fast airport-adjacent and local surges.',
    avoidWarning: 'Watch Merghany / Salah Salem bottlenecks when heading toward Downtown.',
    reasonTemplate: 'Strong late-night cafe/dining culture plus quick proximity to Cairo Airport T1/T2/T3.',
  },
];

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function decodeWeatherCode(code: number, precipMm: number, windKmh: number): {
  label: string;
  multiplier: number;
} {
  if (code >= 95) return { label: 'Thunderstorm (Extreme Surge Driver)', multiplier: 1.45 };
  if (code >= 61 || precipMm >= 1.0) return { label: 'Active Rain (High Surge Catalyst)', multiplier: 1.35 };
  if (code >= 51 || precipMm > 0.1) return { label: 'Light Rain / Drizzle (+Surge)', multiplier: 1.22 };
  if (code === 45 || code === 48) return { label: 'Dense Fog / Low Visibility (+Demand)', multiplier: 1.15 };
  if (windKmh >= 35) return { label: 'High Winds (+Ride Demand)', multiplier: 1.12 };
  if (code >= 1 && code <= 3) return { label: 'Partly Cloudy / Clear Roads', multiplier: 1.0 };
  return { label: 'Clear Sky', multiplier: 1.0 };
}

export async function fetchLiveWeather(lat: number, lng: number): Promise<{
  weather: LiveWeatherSignal;
  isLive: boolean;
}> {
  const fallbackLocal = new Date();
  const fallback: LiveWeatherSignal = {
    temperatureC: null,
    precipitationMm: 0,
    windSpeedKmh: 0,
    weatherCode: 0,
    conditionLabel: 'Clear (Live feed unavailable)',
    weatherMultiplier: 1.0,
    timezone: 'Africa/Cairo',
    localTimeIso: fallbackLocal.toISOString(),
  };

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 3000);
    if (!res.ok) return { weather: fallback, isLive: false };

    const data = await res.json();
    const cur = data?.current || {};
    const temp = typeof cur.temperature_2m === 'number' ? cur.temperature_2m : null;
    const precip = typeof cur.precipitation === 'number' ? cur.precipitation : (typeof cur.rain === 'number' ? cur.rain : 0);
    const wind = typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : 0;
    const code = typeof cur.weather_code === 'number' ? cur.weather_code : 0;

    let decoded = decodeWeatherCode(code, precip, wind);
    if (temp !== null && temp >= 38 && decoded.multiplier < 1.15) {
      decoded = { label: `Extreme Heat (${Math.round(temp)}°C • High AC Ride Demand)`, multiplier: 1.18 };
    }

    return {
      weather: {
        temperatureC: temp,
        precipitationMm: precip,
        windSpeedKmh: wind,
        weatherCode: code,
        conditionLabel: decoded.label,
        weatherMultiplier: decoded.multiplier,
        timezone: data?.timezone || 'Africa/Cairo',
        localTimeIso: cur.time || fallbackLocal.toISOString(),
      },
      isLive: true,
    };
  } catch {
    return { weather: fallback, isLive: false };
  }
}

export async function fetchReverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}&accept-language=en`;
    const res = await fetchWithTimeout(
      url,
      { headers: { 'User-Agent': 'SurgePilotAI/1.0 (driver-heatmap-advisor)' } },
      2500
    );
    if (!res.ok) return formatCoordFallback(lat, lng);
    const data = await res.json();
    const addr = data?.address || {};
    const parts = [
      addr.neighbourhood || addr.suburb || addr.quarter || addr.road,
      addr.city || addr.town || addr.state_district || addr.state,
      addr.country_code ? String(addr.country_code).toUpperCase() : '',
    ].filter(Boolean);
    return parts.length > 0 ? parts.slice(0, 3).join(', ') : formatCoordFallback(lat, lng);
  } catch {
    return formatCoordFallback(lat, lng);
  }
}

function formatCoordFallback(lat: number, lng: number): string {
  const distToCairo = Math.hypot(lat - 30.0444, lng - 31.2357);
  if (distToCairo < 0.6) return 'Greater Cairo Metro, EG';
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

function mapOverpassCategory(tags: Record<string, string>): LivePoiSignal['category'] | null {
  if (tags.aeroway === 'aerodrome' || tags.aeroway === 'terminal') return 'airport';
  if (tags.railway === 'station' || tags.station === 'subway' || tags.public_transport === 'station') return 'transit';
  if (tags.shop === 'mall' || tags.amenity === 'marketplace') return 'mall';
  if (tags.leisure === 'stadium') return 'stadium';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'university') return 'university';
  if (tags.amenity === 'nightclub' || tags.amenity === 'bar' || tags.amenity === 'cinema' || tags.amenity === 'theatre') return 'nightlife';
  if (tags.tourism === 'hotel') return 'hotel';
  return null;
}

export async function fetchNearbyOsmPois(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<Array<{ name: string; category: LivePoiSignal['category']; lat: number; lng: number }>> {
  const clampedMeters = Math.min(Math.max(radiusKm, 3), 12) * 1000;
  const query = `
[out:json][timeout:5];
(
  nw(around:${clampedMeters},${lat.toFixed(4)},${lng.toFixed(4)})["aeroway"~"aerodrome|terminal"];
  nw(around:${clampedMeters},${lat.toFixed(4)},${lng.toFixed(4)})["railway"="station"];
  nw(around:${clampedMeters},${lat.toFixed(4)},${lng.toFixed(4)})["shop"="mall"];
  nw(around:${clampedMeters},${lat.toFixed(4)},${lng.toFixed(4)})["leisure"="stadium"];
  nw(around:${Math.min(clampedMeters, 6000)},${lat.toFixed(4)},${lng.toFixed(4)})["amenity"~"hospital|university|nightclub|cinema"];
);
out center 25;
  `.trim();

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        },
        4500
      );
      if (!res.ok) continue;
      const json = await res.json();
      const elements = Array.isArray(json?.elements) ? json.elements : [];
      const seen = new Set<string>();
      const results: Array<{ name: string; category: LivePoiSignal['category']; lat: number; lng: number }> = [];

      for (const el of elements) {
        const tags = el.tags || {};
        const name = tags['name:en'] || tags.name;
        if (!name || typeof name !== 'string' || name.length < 3) continue;
        const cat = mapOverpassCategory(tags);
        if (!cat) continue;
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (typeof elLat !== 'number' || typeof elLng !== 'number') continue;

        const key = `${cat}:${name.toLowerCase().slice(0, 24)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ name, category: cat, lat: elLat, lng: elLng });
      }

      if (results.length > 0) return results.slice(0, 24);
    } catch {
      // Try next mirror
    }
  }
  return [];
}

export async function fetchLiveAviationSignals(
  lat: number,
  lng: number,
  apiKey?: string
): Promise<Array<{
  flightLabel: string;
  airportCode: 'CAI' | 'SPX';
  lat: number;
  lng: number;
  etaLabel: string;
  mult: number;
}>> {
  const key = apiKey || process.env.AVIATIONSTACK_API_KEY || process.env.NEXT_PUBLIC_FLIGHTSTATS_API_KEY || '';
  if (!key) return [];

  // Only query Cairo/Sphinx aviation feed when driver is within ~90km of Greater Cairo
  const distCairoKm = calculateDistanceMeters(lat, lng, 30.0444, 31.2357) / 1000;
  if (distCairoKm > 90) return [];

  const airports: Array<{ code: 'CAI' | 'SPX'; lat: number; lng: number }> = [
    { code: 'CAI', lat: 30.1219, lng: 31.4056 },
    { code: 'SPX', lat: 30.1147, lng: 30.8992 },
  ];

  const out: Array<{
    flightLabel: string;
    airportCode: 'CAI' | 'SPX';
    lat: number;
    lng: number;
    etaLabel: string;
    mult: number;
  }> = [];

  await Promise.all(
    airports.map(async (ap) => {
      try {
        const url = `http://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(key)}&arr_iata=${ap.code}&limit=25`;
        const res = await fetchWithTimeout(url, {}, 3500);
        if (!res.ok) return;
        const json = await res.json();
        const flights = Array.isArray(json?.data) ? json.data : [];
        const nowMs = Date.now();

        for (const f of flights) {
          const arrIata = String(f?.arrival?.iata || '').toUpperCase();
          if (arrIata !== ap.code) continue;

          const etaRaw = f?.arrival?.actual || f?.arrival?.estimated || f?.arrival?.scheduled || '';
          const etaMs = etaRaw ? Date.parse(etaRaw) : NaN;
          if (!Number.isFinite(etaMs)) continue;

          // Only keep imminent arrivals (-25 mins to +95 mins from right now)
          const diffMins = (etaMs - nowMs) / 60000;
          if (diffMins < -25 || diffMins > 95) continue;

          const airline = f?.airline?.name || 'Flight';
          const flightNo = f?.flight?.iata || f?.flight?.number || '';
          const origin = f?.departure?.airport || f?.departure?.iata || 'International';
          const status = f?.flight_status || 'scheduled';
          const etaLabel = etaRaw.slice(11, 16);
          out.push({
            flightLabel: `${airline} ${flightNo} from ${origin} (${status})`,
            airportCode: ap.code,
            lat: ap.lat,
            lng: ap.lng,
            etaLabel,
            mult: ap.code === 'SPX' ? 2.45 : 2.35,
          });
        }
      } catch {
        // Graceful skip on timeout
      }
    })
  );

  return out;
}

function getLocalHourAndWeekend(timezone: string): { hour: number; dayOfWeek: number; label: string; isEgyptWeekend: boolean } {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'Africa/Cairo',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || 'Thu';
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '12';
    const minStr = parts.find((p) => p.type === 'minute')?.value || '00';
    const hour = parseInt(hourStr, 10) % 24;
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[weekdayStr] ?? now.getDay();
    // Egypt weekend is Fri (5) & Sat (6); Thursday night (4, >=19) also behaves like weekend
    const isEgyptWeekend = dayOfWeek === 5 || dayOfWeek === 6 || (dayOfWeek === 4 && hour >= 19);
    return {
      hour,
      dayOfWeek,
      label: `${weekdayStr} ${String(hour).padStart(2, '0')}:${minStr} (${timezone})`,
      isEgyptWeekend,
    };
  } catch {
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    return {
      hour,
      dayOfWeek,
      label: now.toLocaleTimeString(),
      isEgyptWeekend: dayOfWeek === 5 || dayOfWeek === 6,
    };
  }
}

function scoreCategoryForHour(
  category: LivePoiSignal['category'],
  hour: number,
  isWeekend: boolean
): { baseMult: number; uberFit: number; didiFit: number; timeWindow: string; why: string; staging: string; avoid: string } {
  const isLateNight = hour >= 22 || hour <= 4;
  const isMorningRush = hour >= 6 && hour <= 10 && !isWeekend;
  const isEveningRush = hour >= 16 && hour <= 21;

  switch (category) {
    case 'airport':
      return {
        baseMult: isLateNight ? 2.35 : isEveningRush ? 2.15 : 1.85,
        uberFit: 95,
        didiFit: 76,
        timeWindow: 'Next 20–60 mins (Arrival wave)',
        why: 'Arriving passengers with luggage prioritize reliable high-tier pickups and longer, high-margin rides.',
        staging: 'Stage near arrivals service loop or catch drop-off rematches instead of idling deep in an oversaturated lot.',
        avoid: 'Do not sit in the holding queue if >40 drivers are ahead; reposition after 15 mins without pings.',
      };
    case 'nightlife':
      return {
        baseMult: isLateNight ? (isWeekend ? 2.25 : 1.95) : isEveningRush ? 1.75 : 1.25,
        uberFit: 90,
        didiFit: 84,
        timeWindow: isLateNight ? 'Active right now (Late-night peak)' : 'Building through evening',
        why: isLateNight
          ? 'Late-night dining/cafe/entertainment exits with low active driver supply create sharp surge spikes.'
          : 'Dense restaurant and social traffic produces continuous high-margin trips.',
        staging: 'Wait on wide main arteries adjacent to dining strips for immediate curbside pickup.',
        avoid: 'Avoid narrow one-way side alleys where pickup cancellations spike.',
      };
    case 'mall':
      return {
        baseMult: hour >= 20 || hour <= 1 ? 1.85 : isEveningRush ? 1.75 : 1.4,
        uberFit: 87,
        didiFit: 88,
        timeWindow: hour >= 21 ? 'Closing outflow window (Next 45m)' : 'Steady mall turnover',
        why: 'Shoppers with bags and dining visitors generate reliable multi-kilometer rides with low cancellation.',
        staging: 'Stage at exterior perimeter gates or pickup drop-off zones rather than basement garages.',
        avoid: 'Skip entering multi-level mall parking ramps during peak exit bottlenecks.',
      };
    case 'transit':
      return {
        baseMult: isMorningRush || isEveningRush ? 1.75 : isLateNight ? 1.65 : 1.45,
        uberFit: 80,
        didiFit: 92,
        timeWindow: 'Immediate continuous turnover',
        why: 'Rail/metro commuters and intercity travelers produce rapid consecutive bookings (ideal for DiDi quests).',
        staging: 'Position 150–250m outside station choke points along main feeder avenues.',
        avoid: 'Avoid blocking taxi stands or police-enforced transit lanes directly at station doors.',
      };
    case 'stadium':
      return {
        baseMult: hour >= 18 && hour <= 23 ? 2.4 : 1.35,
        uberFit: 92,
        didiFit: 88,
        timeWindow: 'Event egress surge window',
        why: 'Concentrated crowd egress overwhelms local driver supply within minutes.',
        staging: 'Stage 400–600m outside main stadium perimeter roads facing outward traffic.',
        avoid: 'Never enter inner stadium security cordons right at full-time whistle.',
      };
    case 'business':
      return {
        baseMult: isMorningRush || isEveningRush ? 1.85 : 1.25,
        uberFit: 88,
        didiFit: 89,
        timeWindow: isMorningRush ? 'Morning commute wave' : isEveningRush ? 'Office departure surge' : 'Off-peak business travel',
        why: 'Corporate commuters create predictable point-to-point demand with low rider cancellation.',
        staging: 'Wait near main office park gates or primary highway feeder intersections.',
        avoid: 'Business districts cool sharply after 20:30 and on weekends.',
      };
    case 'hospital':
      return {
        baseMult: isLateNight ? 1.65 : 1.45,
        uberFit: 82,
        didiFit: 88,
        timeWindow: '24/7 steady essential demand',
        why: 'Shift changes, emergency visitors, and late-night outpatient departures sustain constant ride requests.',
        staging: 'Stage along the main avenue outside the hospital gate.',
        avoid: 'Keep ambulance bays completely clear.',
      };
    case 'hotel':
      return {
        baseMult: isLateNight || (hour >= 5 && hour <= 9) ? 1.75 : 1.5,
        uberFit: 93,
        didiFit: 74,
        timeWindow: 'Airport/tourist transfer window',
        why: 'Hotel guests frequently book airport transfers and long-distance Comfort rides on Uber.',
        staging: 'Stage on main boulevard outside hotel driveway.',
        avoid: 'Respect hotel valet/taxi-only driveway rules.',
      };
    default:
      return {
        baseMult: 1.55,
        uberFit: 85,
        didiFit: 85,
        timeWindow: 'Next 30 mins',
        why: 'High local passenger density relative to nearby available drivers.',
        staging: 'Position on closest multi-lane avenue for fast direction flexibility.',
        avoid: 'Avoid crossing major bridge bottlenecks unless surge >= 1.6x.',
      };
  }
}

export function buildCandidateSignals(params: {
  lat: number;
  lng: number;
  radiusKm: number;
  platformFocus: TargetPlatform;
  weather: LiveWeatherSignal;
  osmPois: Array<{ name: string; category: LivePoiSignal['category']; lat: number; lng: number }>;
  liveFlights: Array<{ flightLabel: string; airportCode: 'CAI' | 'SPX'; lat: number; lng: number; etaLabel: string; mult: number }>;
  radarHotspots: HotspotRecord[];
}): LivePoiSignal[] {
  const { lat, lng, radiusKm, platformFocus, weather, osmPois, liveFlights, radarHotspots } = params;
  const { hour, isEgyptWeekend } = getLocalHourAndWeekend(weather.timezone);
  const candidates: LivePoiSignal[] = [];

  const maxSearchKm = Math.max(radiusKm * 1.8, 12);
  const distToCairoCenter = calculateDistanceMeters(lat, lng, 30.0444, 31.2357) / 1000;

  // 1. Add Greater Cairo curated high-yield corridors if driver is in Greater Cairo/Giza
  if (distToCairoCenter < 55) {
    for (const c of CAIRO_CORRIDORS) {
      const distKm = calculateDistanceMeters(lat, lng, c.lat, c.lng) / 1000;
      if (distKm > Math.max(maxSearchKm, 28)) continue;

      const isPeakHour = c.peakHours.includes(hour);
      const timeBoost = isPeakHour ? 0.35 : -0.15;
      const weekendDelta = isEgyptWeekend && c.weekendBoost ? 0.2 : !isEgyptWeekend && c.category === 'business' ? 0.15 : 0;
      const catScore = scoreCategoryForHour(c.category, hour, isEgyptWeekend);

      const rawMult = Math.max(1.1, (catScore.baseMult + timeBoost + weekendDelta) * weather.weatherMultiplier);
      const projectedMultiplier = Math.min(2.95, Number(rawMult.toFixed(2)));

      const deadheadMins = Math.max(2, Math.round((distKm / 32) * 60));
      const outsideRadiusPenalty = distKm > radiusKm ? (distKm - radiusKm) * 2.2 : 0;
      const deadheadPenalty = distKm * 1.45 + outsideRadiusPenalty;
      const platformFit =
        platformFocus === 'uber'
          ? c.uberBias
          : platformFocus === 'didi'
          ? c.didiBias
          : Math.max(c.uberBias, c.didiBias);

      const netProfitScore = Number(((projectedMultiplier * 44 + platformFit * 0.55) - deadheadPenalty).toFixed(1));

      const bestPlatform: LivePoiSignal['bestPlatform'] =
        c.uberBias - c.didiBias >= 8
          ? 'Uber'
          : c.didiBias - c.uberBias >= 8
          ? 'DiDi'
          : 'Uber + DiDi';

      candidates.push({
        name: c.name,
        category: c.category,
        lat: c.lat,
        lng: c.lng,
        distanceKm: Number(distKm.toFixed(1)),
        estDriveMins: deadheadMins,
        uberFit: c.uberBias,
        didiFit: c.didiBias,
        projectedMultiplier,
        netProfitScore,
        whyNow: `${c.reasonTemplate} ${isPeakHour ? 'Currently inside peak activity window.' : 'Moderate baseline flow.'}`,
        stagingTip: c.stagingTip,
        avoidWarning: c.avoidWarning,
        timeWindow: isPeakHour ? 'Active Peak Now (Next 30–60m)' : catScore.timeWindow,
        bestPlatform,
        sourceTag: 'Cairo Corridor Intelligence',
      });
    }
  }

  // 2. Add Live OSM Overpass POIs (works globally anywhere the driver is!)
  for (const poi of osmPois) {
    const distKm = calculateDistanceMeters(lat, lng, poi.lat, poi.lng) / 1000;
    // Skip duplicates very close to an existing corridor of same category
    const duplicate = candidates.some(
      (existing) =>
        calculateDistanceMeters(existing.lat, existing.lng, poi.lat, poi.lng) < 900 &&
        existing.category === poi.category
    );
    if (duplicate) continue;

    const catScore = scoreCategoryForHour(poi.category, hour, isEgyptWeekend);
    const projectedMultiplier = Math.min(2.75, Number((catScore.baseMult * weather.weatherMultiplier).toFixed(2)));
    const deadheadMins = Math.max(2, Math.round((distKm / 28) * 60));
    const outsideRadiusPenalty = distKm > radiusKm ? (distKm - radiusKm) * 2.2 : 0;
    const deadheadPenalty = distKm * 1.45 + outsideRadiusPenalty;
    const platformFit =
      platformFocus === 'uber'
        ? catScore.uberFit
        : platformFocus === 'didi'
        ? catScore.didiFit
        : Math.max(catScore.uberFit, catScore.didiFit);

    const netProfitScore = Number(((projectedMultiplier * 42 + platformFit * 0.5) - deadheadPenalty).toFixed(1));
    const bestPlatform: LivePoiSignal['bestPlatform'] =
      catScore.uberFit - catScore.didiFit >= 8
        ? 'Uber'
        : catScore.didiFit - catScore.uberFit >= 8
        ? 'DiDi'
        : 'Uber + DiDi';

    candidates.push({
      name: poi.name,
      category: poi.category,
      lat: poi.lat,
      lng: poi.lng,
      distanceKm: Number(distKm.toFixed(1)),
      estDriveMins: deadheadMins,
      uberFit: catScore.uberFit,
      didiFit: catScore.didiFit,
      projectedMultiplier,
      netProfitScore,
      whyNow: catScore.why,
      stagingTip: catScore.staging,
      avoidWarning: catScore.avoid,
      timeWindow: catScore.timeWindow,
      bestPlatform,
      sourceTag: 'OpenStreetMap Live POI',
    });
  }

  // 3. Fuse Live AviationStack Flights
  if (liveFlights.length > 0) {
    const caiFlights = liveFlights.filter((f) => f.airportCode === 'CAI');
    const spxFlights = liveFlights.filter((f) => f.airportCode === 'SPX');
    for (const group of [
      { code: 'CAI', list: caiFlights, lat: 30.1219, lng: 31.4056, name: 'Cairo Airport Terminal 3 Arrivals (Live Flight Wave)' },
      { code: 'SPX', list: spxFlights, lat: 30.1147, lng: 30.8992, name: 'Sphinx Airport SPX Arrivals (Live Flight Wave)' },
    ]) {
      if (group.list.length === 0) continue;
      const distKm = calculateDistanceMeters(lat, lng, group.lat, group.lng) / 1000;
      const summary = group.list.slice(0, 2).map((f) => `${f.flightLabel} @ ${f.etaLabel}`).join(' • ');
      const existing = candidates.find((c) => calculateDistanceMeters(c.lat, c.lng, group.lat, group.lng) < 1200);
      if (existing) {
        existing.whyNow = `Live AviationStack arrivals: ${summary}. ${existing.whyNow}`;
        existing.projectedMultiplier = Math.max(existing.projectedMultiplier, group.list[0].mult);
        existing.netProfitScore += 18;
        existing.sourceTag = 'Live AviationStack + Corridor';
      } else {
        candidates.push({
          name: group.name,
          category: 'airport',
          lat: group.lat,
          lng: group.lng,
          distanceKm: Number(distKm.toFixed(1)),
          estDriveMins: Math.max(4, Math.round((distKm / 36) * 60)),
          uberFit: 96,
          didiFit: 78,
          projectedMultiplier: group.list[0].mult,
          netProfitScore: Number(((group.list[0].mult * 48) - distKm * 1.1).toFixed(1)),
          whyNow: `Live AviationStack arrivals detected: ${summary}.`,
          stagingTip: 'Position on arrivals service lane 15–25 minutes after touchdown for baggage-claim exit wave.',
          avoidWarning: 'Monitor driver queue length before entering waiting lot.',
          timeWindow: 'Immediate Flight Wave (Next 20–50m)',
          bestPlatform: 'Uber',
          sourceTag: 'Live AviationStack Feed',
        });
      }
    }
  }

  // 4. Fuse active radar hotspots passed from client if not already covered
  for (const h of radarHotspots.slice(0, 6)) {
    if (typeof h.latitude !== 'number' || typeof h.longitude !== 'number') continue;
    const distKm = calculateDistanceMeters(lat, lng, h.latitude, h.longitude) / 1000;
    const alreadyCovered = candidates.some((c) => calculateDistanceMeters(c.lat, c.lng, h.latitude!, h.longitude!) < 1100);
    if (alreadyCovered) continue;

    const uber = h.active_uber_demand_score || 75;
    const didi = h.active_didi_demand_score || 70;
    candidates.push({
      name: h.primary_demand_driver?.split('•')[0]?.trim() || h.city_zone || 'Active H3 Surge Hexagon',
      category: 'hotspot',
      lat: h.latitude,
      lng: h.longitude,
      distanceKm: Number(distKm.toFixed(1)),
      estDriveMins: Math.max(2, Math.round((distKm / 30) * 60)),
      uberFit: uber,
      didiFit: didi,
      projectedMultiplier: h.profit_coefficient,
      netProfitScore: Number(((h.profit_coefficient * 44) - distKm * 1.2).toFixed(1)),
      whyNow: h.primary_demand_driver || 'Elevated H3 cell demand detected on live radar.',
      stagingTip: 'Drive to the center of the H3 hexagon and stay on main arterial roads.',
      avoidWarning: 'Verify demand persists if travel time exceeds 15 minutes.',
      timeWindow: 'Active Now',
      bestPlatform: uber - didi >= 8 ? 'Uber' : didi - uber >= 8 ? 'DiDi' : 'Uber + DiDi',
      sourceTag: 'Live H3 Radar',
    });
  }

  // Sort by Net Profit Score descending
  candidates.sort((a, b) => b.netProfitScore - a.netProfitScore);
  return candidates.slice(0, 12);
}

export function buildDeterministicAdvice(params: {
  driverArea: string;
  weather: LiveWeatherSignal;
  platformFocus: TargetPlatform;
  candidates: LivePoiSignal[];
  counts: AIInsightsResponse['signalsUsed'];
}): AIInsightsResponse {
  const { driverArea, weather, platformFocus, candidates, counts } = params;
  const { hour, label, isEgyptWeekend } = getLocalHourAndWeekend(weather.timezone);

  const top = candidates.slice(0, 4);
  const best = top[0];

  const recommendations: AIRecommendation[] = top.map((c, idx) => {
    const lowMult = Math.max(1.15, Number((c.projectedMultiplier - 0.15).toFixed(2)));
    const highMult = Number((c.projectedMultiplier + 0.2).toFixed(2));
    const boostLow = Math.round((lowMult - 1) * 100);
    const boostHigh = Math.round((highMult - 1) * 100);

    let chosenPlatform = c.bestPlatform;
    if (platformFocus === 'uber' && c.uberFit >= 70) chosenPlatform = 'Uber';
    if (platformFocus === 'didi' && c.didiFit >= 70) chosenPlatform = 'DiDi';

    const confidence = Math.min(96, Math.max(68, Math.round(74 + (c.projectedMultiplier - 1.2) * 12 - c.distanceKm * 0.4)));

    return {
      rank: idx + 1,
      locationName: c.name,
      zone: c.sourceTag,
      lat: c.lat,
      lng: c.lng,
      h3Index: latLngToCell(c.lat, c.lng, 8),
      recommendedPlatform: chosenPlatform,
      estimatedSurge: `${lowMult.toFixed(2)}x – ${highMult.toFixed(2)}x`,
      confidencePct: confidence,
      distanceKm: c.distanceKm,
      driveTimeMins: c.estDriveMins,
      whyNow: c.whyNow,
      stagingAdvice: c.stagingTip,
      timeWindow: c.timeWindow,
      cautionTip: c.avoidWarning,
      estimatedEarningsBoost: `+${boostLow}% to +${boostHigh}% vs base`,
    };
  });

  const headlineAdvice = best
    ? `Head toward ${best.name} (${best.distanceKm} km, ~${best.estDriveMins} min) prioritizing ${best.bestPlatform} — projected ${best.projectedMultiplier.toFixed(2)}x earnings boost.`
    : 'Stay online near your nearest arterial transit or commercial corridor and dual-run Uber + DiDi.';

  const timeProfile =
    hour >= 22 || hour <= 4
      ? 'Late-night high-margin window'
      : hour >= 6 && hour <= 10 && !isEgyptWeekend
      ? 'Morning commuter rush'
      : hour >= 16 && hour <= 21
      ? 'Evening peak outflow'
      : 'Midday balanced demand';

  return {
    ok: true,
    engine: 'telemetry-engine',
    generatedAt: new Date().toISOString(),
    driverArea,
    localTimeLabel: label,
    weather,
    platformFocus,
    headlineAdvice,
    platformStrategy: {
      uber: `${timeProfile}: Use Uber for airports, Comfort/Select trips, Zamalek, New Cairo, Maadi & Sheikh Zayed where organic surge ceilings stay highest.`,
      didi: `${timeProfile}: Run DiDi in parallel across dense urban hubs (Nasr City, Mohandessin, Dokki, Heliopolis, Downtown) to stack short-trip bonuses and cut idle time.`,
    },
    avoidAlert: best
      ? best.avoidWarning
      : 'Avoid deadheading >12 km without an active arrival wave or weather spike.',
    recommendations,
    groundingSources: [],
    signalsUsed: counts,
  };
}

function extractGeminiTextAndSources(data: any): { text: string; sources: GroundingSource[] } {
  const candidate = data?.candidates?.[0];
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const textParts = parts
    .filter((p: any) => p && typeof p.text === 'string' && p.thought !== true)
    .map((p: any) => p.text);

  const rawChunks = Array.isArray(candidate?.groundingMetadata?.groundingChunks)
    ? candidate.groundingMetadata.groundingChunks
    : [];

  const seenUris = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const ch of rawChunks) {
    const uri = ch?.web?.uri;
    const title = ch?.web?.title || uri;
    if (uri && typeof uri === 'string' && !seenUris.has(uri)) {
      seenUris.add(uri);
      sources.push({ title: String(title), uri });
    }
  }

  return { text: textParts.join('\n').trim(), sources: sources.slice(0, 6) };
}

function parseJsonFromLlmText(raw: string): any | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function runGeminiGroundedAdvice(params: {
  geminiApiKey: string;
  enableSearchGrounding: boolean;
  lat: number;
  lng: number;
  driverArea: string;
  weather: LiveWeatherSignal;
  platformFocus: TargetPlatform;
  candidates: LivePoiSignal[];
  fallback: AIInsightsResponse;
}): Promise<AIInsightsResponse> {
  const {
    geminiApiKey,
    enableSearchGrounding,
    lat,
    lng,
    driverArea,
    weather,
    platformFocus,
    candidates,
    fallback,
  } = params;

  const { label } = getLocalHourAndWeekend(weather.timezone);

  const candidateBrief = candidates.slice(0, 8).map((c, i) => ({
    id: i + 1,
    name: c.name,
    category: c.category,
    lat: c.lat,
    lng: c.lng,
    distanceKm: c.distanceKm,
    estDriveMins: c.estDriveMins,
    projectedMultiplier: c.projectedMultiplier,
    uberFit: c.uberFit,
    didiFit: c.didiFit,
    source: c.sourceTag,
    signalNote: c.whyNow,
  }));

  const prompt = `
You are an elite real-time rideshare earnings strategist for Uber and DiDi drivers.
Analyze the driver's LIVE context below and recommend the TOP 3 to 4 exact destinations to head to RIGHT NOW for immediate very high earnings.

DRIVER LIVE CONTEXT:
- GPS Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}
- Detected Area: ${driverArea}
- Local Day & Time: ${label}
- Live Weather: ${weather.conditionLabel}, Temp: ${weather.temperatureC ?? 'N/A'}°C, Precip: ${weather.precipitationMm}mm, Wind: ${weather.windSpeedKmh}km/h (Weather Surge Factor: ${weather.weatherMultiplier}x)
- Preferred Platform Filter: ${platformFocus.toUpperCase()}

VERIFIED NEARBY HIGH-DEMAND CANDIDATES (from Live OSM POIs, Flight Feeds, Corridor Telemetry & H3 Radar):
${JSON.stringify(candidateBrief, null, 2)}

INSTRUCTIONS:
1. ${enableSearchGrounding ? 'Use Google Search to check if there are any live events, concerts, football matches, exhibitions, mall peaks, or flight arrival waves happening RIGHT NOW / TONIGHT near ' + driverArea + ' that create immediate Uber or DiDi surges.' : 'Rank based on the live telemetry, deadhead drive distance, weather, and time-of-day curves.'}
2. Balance surge potential vs deadhead drive distance (do NOT tell a driver to drive 20km if a closer 1.9x zone beats it on net hourly profit!).
3. Clearly differentiate **Uber** vs **DiDi** strength for each spot.
4. For every recommendation, provide exact coordinates (use the candidate's lat/lng or a verified venue lat/lng within 25km of the driver).
5. Return ONLY a valid JSON object (no markdown commentary outside JSON) matching this exact schema:
{
  "headlineAdvice": "One sharp immediate action directive (max 28 words)",
  "platformStrategy": {
    "uber": "Concrete immediate Uber strategy for right now (1-2 sentences)",
    "didi": "Concrete immediate DiDi strategy for right now (1-2 sentences)"
  },
  "avoidAlert": "One specific trap, traffic choke point, or low-yield zone to avoid right now",
  "recommendations": [
    {
      "rank": 1,
      "locationName": "Exact place / terminal / district name",
      "zone": "District or category",
      "lat": 30.1219,
      "lng": 31.4056,
      "recommendedPlatform": "Uber" | "DiDi" | "Uber + DiDi",
      "estimatedSurge": "1.90x – 2.45x",
      "confidencePct": 91,
      "whyNow": "Specific live reason why high earnings are happening right now",
      "stagingAdvice": "Exact street/gate/lane to wait at for fast pings",
      "timeWindow": "e.g. Next 20–45 mins",
      "cautionTip": "Specific pickup/queue/traffic caution",
      "estimatedEarningsBoost": "+90% to +145% vs base"
    }
  ]
}
`.trim();

  const attempts: Array<{ model: string; withSearch: boolean }> = [];
  if (enableSearchGrounding) {
    attempts.push(
      { model: 'gemini-flash-latest', withSearch: true },
      { model: 'gemini-3.8-flash', withSearch: true }
    );
  }
  attempts.push(
    { model: 'gemini-flash-lite-latest', withSearch: false },
    { model: 'gemini-3.5-flash-lite', withSearch: false },
    { model: 'gemini-3.1-flash-lite', withSearch: false },
    { model: 'gemini-flash-latest', withSearch: false }
  );

  for (const attempt of attempts) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent`;
    const body: any = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2048,
        ...(attempt.withSearch ? {} : { responseMimeType: 'application/json' }),
      },
    };
    if (attempt.withSearch) {
      body.tools = [{ google_search: {} }];
    }

    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify(body),
        },
        9000
      );

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return fallback;
        }
        continue;
      }

      const data = await res.json();
      const { text, sources } = extractGeminiTextAndSources(data);
      const parsed = parseJsonFromLlmText(text);

      if (!parsed || !Array.isArray(parsed.recommendations) || parsed.recommendations.length === 0) {
        continue;
      }

      const sanitizedRecs: AIRecommendation[] = parsed.recommendations
        .slice(0, 4)
        .map((rec: any, idx: number) => {
          const recLat = typeof rec.lat === 'number' && Math.abs(rec.lat) <= 90 ? rec.lat : candidates[idx]?.lat ?? lat;
          const recLng = typeof rec.lng === 'number' && Math.abs(rec.lng) <= 180 ? rec.lng : candidates[idx]?.lng ?? lng;
          const distKm = Number((calculateDistanceMeters(lat, lng, recLat, recLng) / 1000).toFixed(1));
          const driveTimeMins = Math.max(2, Math.round((distKm / 30) * 60));

          const platRaw = String(rec.recommendedPlatform || '');
          const recommendedPlatform: AIRecommendation['recommendedPlatform'] =
            /uber/i.test(platRaw) && /didi/i.test(platRaw)
              ? 'Uber + DiDi'
              : /didi/i.test(platRaw)
              ? 'DiDi'
              : 'Uber';

          return {
            rank: idx + 1,
            locationName: String(rec.locationName || candidates[idx]?.name || 'High-Demand Hub'),
            zone: String(rec.zone || 'Priority Surge Zone'),
            lat: recLat,
            lng: recLng,
            h3Index: latLngToCell(recLat, recLng, 8),
            recommendedPlatform,
            estimatedSurge: String(rec.estimatedSurge || '1.65x – 2.20x'),
            confidencePct: Math.min(98, Math.max(60, Number(rec.confidencePct) || 85)),
            distanceKm: distKm,
            driveTimeMins,
            whyNow: String(rec.whyNow || candidates[idx]?.whyNow || 'Strong active passenger demand vs available drivers.'),
            stagingAdvice: String(rec.stagingAdvice || candidates[idx]?.stagingTip || 'Stage along main arterial pickup lane.'),
            timeWindow: String(rec.timeWindow || 'Next 30–60 mins'),
            cautionTip: String(rec.cautionTip || candidates[idx]?.avoidWarning || 'Monitor queue length and traffic bottlenecks.'),
            estimatedEarningsBoost: String(rec.estimatedEarningsBoost || '+65% to +120% vs base'),
          };
        });

      return {
        ...fallback,
        engine: attempt.withSearch ? 'gemini-grounded' : 'gemini-direct',
        headlineAdvice: String(parsed.headlineAdvice || fallback.headlineAdvice),
        platformStrategy: {
          uber: String(parsed.platformStrategy?.uber || fallback.platformStrategy.uber),
          didi: String(parsed.platformStrategy?.didi || fallback.platformStrategy.didi),
        },
        avoidAlert: String(parsed.avoidAlert || fallback.avoidAlert),
        recommendations: sanitizedRecs,
        groundingSources: sources,
      };
    } catch {
      continue;
    }
  }

  return fallback;
}
