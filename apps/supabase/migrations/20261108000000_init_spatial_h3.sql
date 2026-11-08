-- apps/supabase/migrations/20261108000000_init_spatial_h3.sql

-- 1. Enable PostGIS geospatial tracking extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create standardized H3 spatial indexing lookup tables
CREATE TABLE IF NOT EXISTS public.urban_hex_grids (
    h3_index VARCHAR(15) PRIMARY KEY, -- Uber H3 Resolution 8 Hex Identifier
    centroid GEOMETRY(Point, 4326),   -- Center point geographic geometry
    city_zone VARCHAR(100) NOT NULL
);

-- 3. Main Hotspot & Multiplier tracking table 
CREATE TABLE IF NOT EXISTS public.live_profit_hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(15) REFERENCES public.urban_hex_grids(h3_index) ON DELETE CASCADE,
    profit_coefficient NUMERIC(3, 2) NOT NULL DEFAULT 1.00, -- Surge multiplier prediction 
    active_uber_demand_score INT DEFAULT 0,
    active_didi_demand_score INT DEFAULT 0,
    active_indrive_demand_score INT DEFAULT 0,
    primary_demand_driver VARCHAR(100), -- e.g., 'Concert Finish', 'Flight Arrival'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Indexing strategies for lightning-fast edge retrieval
CREATE INDEX IF NOT EXISTS idx_hex_grids_centroid ON public.urban_hex_grids USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_live_hotspots_coefficient ON public.live_profit_hotspots (profit_coefficient DESC) WHERE profit_coefficient > 1.2;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.urban_hex_grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_profit_hotspots ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running to avoid duplicate errors
DROP POLICY IF EXISTS "Allow public read urban_hex_grids" ON public.urban_hex_grids;
DROP POLICY IF EXISTS "Allow public read live_profit_hotspots" ON public.live_profit_hotspots;

-- Read policies: allow public anonymous or authenticated driver clients to query heatmaps
CREATE POLICY "Allow public read urban_hex_grids" 
    ON public.urban_hex_grids FOR SELECT USING (true);

CREATE POLICY "Allow public read live_profit_hotspots" 
    ON public.live_profit_hotspots FOR SELECT USING (true);

-- 6. Stored Procedure (RPC) to retrieve nearby hotspots sorted by profit multiplier
CREATE OR REPLACE FUNCTION public.get_nearby_hotspots(
    driver_lat DOUBLE PRECISION,
    driver_lng DOUBLE PRECISION,
    search_radius_meters DOUBLE PRECISION DEFAULT 5000
)
RETURNS TABLE (
    id UUID,
    h3_index VARCHAR(15),
    profit_coefficient NUMERIC(3, 2),
    active_uber_demand_score INT,
    active_didi_demand_score INT,
    active_indrive_demand_score INT,
    primary_demand_driver VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE,
    city_zone VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        h.id,
        h.h3_index,
        h.profit_coefficient,
        h.active_uber_demand_score,
        h.active_didi_demand_score,
        h.active_indrive_demand_score,
        h.primary_demand_driver,
        h.updated_at,
        g.city_zone,
        ST_Y(g.centroid) AS latitude,
        ST_X(g.centroid) AS longitude,
        ST_Distance(
            g.centroid::geography,
            ST_SetSRID(ST_MakePoint(driver_lng, driver_lat), 4326)::geography
        ) AS distance_meters
    FROM public.live_profit_hotspots h
    JOIN public.urban_hex_grids g ON h.h3_index = g.h3_index
    WHERE ST_DWithin(
        g.centroid::geography,
        ST_SetSRID(ST_MakePoint(driver_lng, driver_lat), 4326)::geography,
        search_radius_meters
    )
    ORDER BY h.profit_coefficient DESC, distance_meters ASC;
$$;

-- 7. Enable Supabase Realtime functionality on our hotspot updates table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'live_profit_hotspots'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_profit_hotspots;
    END IF;
END $$;
