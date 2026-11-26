import { NextRequest, NextResponse } from 'next/server';
import {
  TargetPlatform,
  fetchLiveWeather,
  fetchReverseGeocode,
  fetchNearbyOsmPois,
  fetchLiveAviationSignals,
  buildCandidateSignals,
  buildDeterministicAdvice,
  runGeminiGroundedAdvice,
} from '@/lib/ai-insights-engine';
import { HotspotRecord } from '@/lib/h3-utils';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const radiusKm = Math.min(Math.max(Number(body?.radiusKm) || 5, 2), 25);
    const platformFocus: TargetPlatform =
      body?.platformFocus === 'uber' || body?.platformFocus === 'didi' ? body.platformFocus : 'both';

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { ok: false, error: 'Valid driver GPS coordinates (lat, lng) are required.' },
        { status: 400 }
      );
    }

    const clientGeminiKey = typeof body?.geminiApiKey === 'string' ? body.geminiApiKey.trim() : '';
    const serverGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    const effectiveGeminiKey = clientGeminiKey || serverGeminiKey;
    const enableSearchGrounding = body?.enableSearchGrounding !== false;
    const flightApiKey = typeof body?.flightStatsApiKey === 'string' ? body.flightStatsApiKey.trim() : '';
    const radarHotspots: HotspotRecord[] = Array.isArray(body?.hotspots) ? body.hotspots : [];

    // Fetch all live real-world signals in parallel
    const [weatherRes, driverArea, osmPois, liveFlights] = await Promise.all([
      fetchLiveWeather(lat, lng),
      fetchReverseGeocode(lat, lng),
      fetchNearbyOsmPois(lat, lng, radiusKm),
      fetchLiveAviationSignals(lat, lng, flightApiKey),
    ]);

    const candidates = buildCandidateSignals({
      lat,
      lng,
      radiusKm,
      platformFocus,
      weather: weatherRes.weather,
      osmPois,
      liveFlights,
      radarHotspots,
    });

    const counts = {
      weatherLive: weatherRes.isLive,
      osmPoisCount: osmPois.length,
      liveFlightsCount: liveFlights.length,
      radarHotspotsCount: radarHotspots.length,
    };

    const deterministic = buildDeterministicAdvice({
      driverArea,
      weather: weatherRes.weather,
      platformFocus,
      candidates,
      counts,
    });

    if (effectiveGeminiKey) {
      const aiResult = await runGeminiGroundedAdvice({
        geminiApiKey: effectiveGeminiKey,
        enableSearchGrounding,
        lat,
        lng,
        driverArea,
        weather: weatherRes.weather,
        platformFocus,
        candidates,
        fallback: deterministic,
      });
      return NextResponse.json(aiResult, { status: 200 });
    }

    return NextResponse.json(deterministic, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to compute AI earnings insights.' },
      { status: 500 }
    );
  }
}
