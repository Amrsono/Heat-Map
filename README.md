# Rideshare Driver Profit Optimization Web App (SurgePilot AI)

A real-time geospatial intelligence system that empowers rideshare drivers (Uber, DiDi, inDrive) to optimize earnings by predicting and mapping surge demand hotspots using **Uber H3 Resolution 8 Hexagons (~0.7 km²)**, **PostgreSQL/PostGIS**, **Vercel Edge**, **Google Cloud Functions**, and **Google Vertex AI**.

---

## 🏗 System Architecture

```text
├── .github/workflows/         # CI/CD pipelines (Vercel & GCP deployment automations)
├── apps/
│   ├── web/                   # Next.js App Router Client on Vercel Edge
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx   # Driver Map Interface (WebGL H3 Hex Canvas)
│   │   │   │   └── api/
│   │   │   │       └── heatmap/
│   │   │   │           └── route.ts  # Vercel Edge API Route (PostGIS RPC)
│   │   │   ├── components/
│   │   │   │   ├── MapWrapper.tsx     # MapLibre GL WebGL Hexagon Renderer
│   │   │   │   └── ProfitDashboard.tsx# Driver Cockpit HUD & Priority Hotspots
│   │   │   └── lib/
│   │   │       ├── supabase-client.ts # Supabase Realtime Client
│   │   │       └── h3-utils.ts        # Uber H3 Res 8 Spatial Transformations
│   │   ├── next.config.js
│   │   └── package.json
│   └── supabase/               # Local/Cloud Migration Schemas
│       ├── migrations/
│       │   └── 20261108000000_init_spatial_h3.sql # PostGIS & RLS Schemas
│       └── config.toml
└── services/
    ├── data-scraper/          # GCP Cloud Function Event / Flights Scraper
    │   ├── main.py
    │   └── requirements.txt
    └── inference-engine/      # Vertex AI Training & 30m Surge Forecast Pipeline
        ├── model.py           # Gradient Booster Matrix Model
        └── pipeline.py        # Vertex AI Batch Prediction Orchestrator
```

---

## ⚡ Key Highlights

1. **Uber H3 Resolution 8 Spatial Grid**: Standardizes metropolitan surge boundaries into uniform 0.7 km² hexagonal cells to minimize GPS battery drain and optimize spatial rendering.
2. **Vercel Edge API Caching**: High-performance Edge runtime endpoints with `s-maxage=10, stale-while-revalidate=5` to cap database query frequency to 6 queries/min per tile during extreme driver concurrency.
3. **PostgreSQL & PostGIS Stored Procedure**: Fast spatial queries using `ST_DWithin` and `ST_Distance` with GIST indexing on centroids.
4. **Vertex AI Surge Predictor**: Gradient Booster processing vectors `[Day, Time Window, Hex Index, Event Proximity, Volume, Weather Coefficient]` forecasting surge hotspots 30 minutes in advance.
5. **Multi-Platform Demand Radar**: Real-time cross-platform demand scoring comparing **Uber**, **DiDi**, and **inDrive**.

---

## 🚀 Quickstart

### 1. Web App (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the driver cockpit map.

### 2. Supabase PostGIS Setup

To apply the database migrations:

```bash
cd apps/supabase
supabase db reset
# or apply migrations/20261108000000_init_spatial_h3.sql directly in Supabase SQL Editor
```

### 3. Data Scraper (GCP Cloud Function)

```bash
cd services/data-scraper
pip install -r requirements.txt
python main.py
```

### 4. Vertex AI Inference Engine

```bash
cd services/inference-engine
pip install -r requirements.txt
python pipeline.py
```

---

## 🔒 Environment Variables

Copy `apps/web/.env.example` to `apps/web/.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
