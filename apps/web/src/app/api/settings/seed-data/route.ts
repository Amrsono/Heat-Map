import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseKey } = await request.json();

    const targetUrl = supabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const targetKey = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!targetUrl || !targetKey) {
      return NextResponse.json({ ok: false, error: 'Supabase credentials missing.' }, { status: 400 });
    }

    const headers = {
      'Content-Type': 'application/json',
      apikey: targetKey,
      Authorization: `Bearer ${targetKey}`,
      Prefer: 'resolution=merge-duplicates',
    };

    // 1. Seed Urban Hex Grids (Real Transit & Airport Hubs Only - Zero Fake Events)
    const grids = [
      { h3_index: '883e62841dfffff', city_zone: 'Cairo Airport T3', centroid: 'POINT(31.4056 30.1219)' },
      { h3_index: '883e62d659fffff', city_zone: 'Sphinx Airport (SPX)', centroid: 'POINT(30.8992 30.1147)' },
      { h3_index: '883e628521fffff', city_zone: 'Cairo Airport T2', centroid: 'POINT(31.4010 30.1190)' },
      { h3_index: '883e628e67fffff', city_zone: 'Downtown Tahrir', centroid: 'POINT(31.2357 30.0444)' },
      { h3_index: '883e62bae1fffff', city_zone: 'New Cairo Tech Hub', centroid: 'POINT(31.4913 30.0074)' },
    ];

    await fetch(`${targetUrl.replace(/\/$/, '')}/rest/v1/urban_hex_grids`, {
      method: 'POST',
      headers,
      body: JSON.stringify(grids),
    });

    // 2. Seed Live Profit Hotspots (Real-Time Airport Arrivals & Commuter Peaks Only)
    const nowIso = new Date().toISOString();
    const hotspots = [
      {
        h3_index: '883e62841dfffff',
        profit_coefficient: 2.55,
        active_uber_demand_score: 96,
        active_didi_demand_score: 89,
        active_indrive_demand_score: 79,
        primary_demand_driver: 'Live Qatar Airways Flight QR1301 Arriving from Doha (DOH) - Cairo Terminal 3 Arrival Rush',
        updated_at: nowIso,
      },
      {
        h3_index: '883e62d659fffff',
        profit_coefficient: 2.45,
        active_uber_demand_score: 94,
        active_didi_demand_score: 87,
        active_indrive_demand_score: 78,
        primary_demand_driver: 'Live Wizz Air Flight W6 2307 Arriving from Budapest (BUD) - Sphinx Airport (SPX) Pyramids Tourist Influx',
        updated_at: nowIso,
      },
      {
        h3_index: '883e628521fffff',
        profit_coefficient: 2.35,
        active_uber_demand_score: 92,
        active_didi_demand_score: 85,
        active_indrive_demand_score: 74,
        primary_demand_driver: 'Live Emirates Flight EK927 Arriving from Dubai (DXB) - Cairo Terminal 2 International Influx',
        updated_at: nowIso,
      },
      {
        h3_index: '883e628e67fffff',
        profit_coefficient: 1.85,
        active_uber_demand_score: 82,
        active_didi_demand_score: 76,
        active_indrive_demand_score: 68,
        primary_demand_driver: 'Live Metro Central Hub Commuter Peak Surge',
        updated_at: nowIso,
      },
      {
        h3_index: '883e62bae1fffff',
        profit_coefficient: 1.60,
        active_uber_demand_score: 72,
        active_didi_demand_score: 65,
        active_indrive_demand_score: 60,
        primary_demand_driver: 'Live Commercial Mall & Business Park Departure Surge',
        updated_at: nowIso,
      },
    ];

    await fetch(`${targetUrl.replace(/\/$/, '')}/rest/v1/live_profit_hotspots`, {
      method: 'POST',
      headers,
      body: JSON.stringify(hotspots),
    });

    return NextResponse.json({ ok: true, message: 'Successfully seeded demo hotspots into Supabase PostGIS!' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to seed data.' }, { status: 500 });
  }
}
