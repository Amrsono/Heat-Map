import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supabaseUrl, supabaseKey } = body;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, error: 'Both Supabase URL and Key are required to test the connection.' },
        { status: 400 }
      );
    }

    // Ping Supabase PostgREST table endpoint
    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/urban_hex_grids?select=h3_index&limit=1`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (res.ok) {
      return NextResponse.json({
        ok: true,
        message: 'PostGIS Connection Successful! Database tables and API tokens verified.',
      });
    } else {
      const errText = await res.text();
      return NextResponse.json(
        {
          ok: false,
          error: `Supabase responded with status ${res.status}: ${errText.substring(0, 150)}`,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Network request to Supabase failed.' },
      { status: 200 }
    );
  }
}
