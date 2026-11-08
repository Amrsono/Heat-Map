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
      { h3_index: '8828308281fffff', city_zone: 'Cairo Airport T3', centroid: 'POINT(31.4056 30.1219)' },
      { h3_index: '8828308283fffff', city_zone: 'Cairo Intl Stadium', centroid: 'POINT(31.3122 30.0694)' },
      { h3_index: '8828308285fffff', city_zone: 'Downtown Tahrir', centroid: 'POINT(31.2357 30.0444)' },
      { h3_index: '8828308287fffff', city_zone: 'New Cairo Tech Hub', centroid: 'POINT(31.4913 30.0074)' },
    ];

    await fetch(`${targetUrl.replace(/\/$/, '')}/rest/v1/urban_hex_grids`, {
      method: 'POST',
      headers,
      body: JSON.stringify(grids),
    });

    // 2. Seed Live Profit Hotspots
    const hotspots = [
      {
        h3_index: '8828308281fffff',
        profit_coefficient: 2.45,
        active_uber_demand_score: 94,
        active_didi_demand_score: 88,
        active_indrive_demand_score: 76,
        primary_demand_driver: 'Flight MS777 JFK Landed - Terminal 3 Arrival Rush',
      },
      {
        h3_index: '8828308283fffff',
        profit_coefficient: 2.10,
        active_uber_demand_score: 89,
        active_didi_demand_score: 82,
        active_indrive_demand_score: 70,
        primary_demand_driver: 'Derby Cup Final Match Ending - Outflow Surge',
      },
      {
        h3_index: '8828308285fffff',
        profit_coefficient: 1.80,
        active_uber_demand_score: 78,
        active_didi_demand_score: 75,
        active_indrive_demand_score: 65,
        primary_demand_driver: 'Evening Metro Commuter Congestion',
      },
      {
        h3_index: '8828308287fffff',
        profit_coefficient: 1.55,
        active_uber_demand_score: 68,
        active_didi_demand_score: 62,
        active_indrive_demand_score: 58,
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
