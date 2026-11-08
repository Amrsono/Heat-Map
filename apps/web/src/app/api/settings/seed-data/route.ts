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

    // 1. Seed Urban Hex Grids
    const grids = [
      { h3_index: '883e62841dfffff', city_zone: 'Cairo Airport T3', centroid: 'POINT(31.4056 30.1219)' },
      { h3_index: '883e62d659fffff', city_zone: 'Sphinx Airport (SPX)', centroid: 'POINT(30.8992 30.1147)' },
      { h3_index: '883e628521fffff', city_zone: 'Cairo Intl Stadium', centroid: 'POINT(31.3122 30.0694)' },
      { h3_index: '883e628e67fffff', city_zone: 'Downtown Tahrir', centroid: 'POINT(31.2357 30.0444)' },
      { h3_index: '883e62bae1fffff', city_zone: 'New Cairo Tech Hub', centroid: 'POINT(31.4913 30.0074)' },
    ];

    await fetch(`${targetUrl.replace(/\/$/, '')}/rest/v1/urban_hex_grids`, {
      method: 'POST',
      headers,
      body: JSON.stringify(grids),
    });

    // 2. Seed Live Profit Hotspots
    const hotspots = [
      {
        h3_index: '883e62841dfffff',
        profit_coefficient: 2.55,
        active_uber_demand_score: 96,
        active_didi_demand_score: 89,
        active_indrive_demand_score: 79,
        primary_demand_driver: 'Flight MS777 JFK Landed - Cairo Terminal 3 Arrival Rush',
      },
      {
        h3_index: '883e62d659fffff',
        profit_coefficient: 2.45,
        active_uber_demand_score: 94,
        active_didi_demand_score: 87,
        active_indrive_demand_score: 78,
        primary_demand_driver: 'Flight W6 5123 Landed - Sphinx Airport (SPX) Pyramids Tourist Influx',
      },
      {
        h3_index: '883e628521fffff',
        profit_coefficient: 2.35,
        active_uber_demand_score: 92,
        active_didi_demand_score: 85,
        active_indrive_demand_score: 74,
        primary_demand_driver: 'Derby Cup Final Match Ending - Stadium Outflow',
      },
      {
        h3_index: '883e628e67fffff',
        profit_coefficient: 1.85,
        active_uber_demand_score: 82,
        active_didi_demand_score: 76,
        active_indrive_demand_score: 68,
        primary_demand_driver: 'Evening Metro Commuter Congestion',
      },
      {
        h3_index: '883e62bae1fffff',
        profit_coefficient: 1.60,
        active_uber_demand_score: 72,
        active_didi_demand_score: 65,
        active_indrive_demand_score: 60,
        primary_demand_driver: 'Commercial Mall & Business Park Departure',
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
