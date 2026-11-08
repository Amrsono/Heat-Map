'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HotspotRecord, hotspotsToGeoJSON, getSurgeColor } from '@/lib/h3-utils';

interface MapWrapperProps {
  driverLocation: { lat: number; lng: number } | null;
  hotspots: HotspotRecord[];
  selectedHotspot: HotspotRecord | null;
  onSelectHotspot: (hotspot: HotspotRecord | null) => void;
  radiusKm: number;
}

export default function MapWrapper({
  driverLocation,
  hotspots,
  selectedHotspot,
  onSelectHotspot,
  radiusKm,
}: MapWrapperProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initialLat = driverLocation?.lat || 30.0444; // Default to Cairo / Metro
    const initialLng = driverLocation?.lng || 31.2357;

    // Dark vector basemap using Carto Dark Matter style
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO',
          },
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [initialLng, initialLat],
      zoom: 12.5,
      pitch: 35, // 3D perspective for modern driver HUD
      bearing: 0,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      // Add H3 Hexagons Source
      map.addSource('h3-hexagons', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Translucent Fill Layer for H3 Hexagons
      map.addLayer({
        id: 'h3-hex-fill',
        type: 'fill',
        source: 'h3-hexagons',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.75,
            0.45,
          ],
        },
      });

      // Hexagon Outline Layer
      map.addLayer({
        id: 'h3-hex-borders',
        type: 'line',
        source: 'h3-hexagons',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.0,
          'line-opacity': 0.85,
        },
      });

      // Hover and Click interactions
      let hoveredStateId: string | number | null = null;

      map.on('mousemove', 'h3-hex-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          hoveredStateId = feature.properties?.h3_index || null;
        }
      });

      map.on('mouseleave', 'h3-hex-fill', () => {
        map.getCanvas().style.cursor = '';
        hoveredStateId = null;
      });

      map.on('click', 'h3-hex-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties as any;
        if (!props) return;

        const matched = hotspots.find((h) => h.h3_index === props.h3_index) || {
          h3_index: props.h3_index,
          profit_coefficient: parseFloat(props.profit_coefficient),
          active_uber_demand_score: parseInt(props.active_uber_demand_score || 0),
          active_didi_demand_score: parseInt(props.active_didi_demand_score || 0),
          active_indrive_demand_score: parseInt(props.active_indrive_demand_score || 0),
          primary_demand_driver: props.primary_demand_driver,
          city_zone: props.city_zone,
          latitude: props.latitude ? parseFloat(props.latitude) : undefined,
          longitude: props.longitude ? parseFloat(props.longitude) : undefined,
          distance_meters: props.distance_meters ? parseFloat(props.distance_meters) : undefined,
        };

        onSelectHotspot(matched);

        // Show popup
        if (popupRef.current) popupRef.current.remove();

        const color = getSurgeColor(matched.profit_coefficient);
        const popup = new maplibregl.Popup({ closeButton: true, offset: 15 })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="space-y-1.5 font-sans">
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs uppercase font-mono text-zinc-400">H3 RES 8: ${matched.h3_index.substring(0, 7)}...</span>
                <span class="px-2 py-0.5 rounded text-xs font-bold" style="background-color: ${color}25; color: ${color};">
                  ${matched.profit_coefficient.toFixed(2)}x SURGE
                </span>
              </div>
              <div class="text-sm font-semibold text-white">${matched.primary_demand_driver || 'High Volume Demand'}</div>
              <div class="grid grid-cols-3 gap-1 pt-1 text-center text-xs">
                <div class="bg-black/40 rounded p-1">
                  <div class="text-[10px] text-zinc-400">Uber</div>
                  <div class="font-bold text-emerald-400">${matched.active_uber_demand_score}%</div>
                </div>
                <div class="bg-black/40 rounded p-1">
                  <div class="text-[10px] text-zinc-400">DiDi</div>
                  <div class="font-bold text-amber-400">${matched.active_didi_demand_score}%</div>
                </div>
                <div class="bg-black/40 rounded p-1">
                  <div class="text-[10px] text-zinc-400">inDrive</div>
                  <div class="font-bold text-blue-400">${matched.active_indrive_demand_score}%</div>
                </div>
              </div>
            </div>
          `)
          .addTo(map);

        popupRef.current = popup;
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Driver Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverLocation) return;

    if (!driverMarkerRef.current) {
      // Create custom pulsing driver vehicle marker
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center';
      el.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-emerald-500/20 driver-ping-circle flex items-center justify-center">
          <div class="w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-black rounded-full"></div>
          </div>
        </div>
      `;

      driverMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .addTo(map);
    } else {
      driverMarkerRef.current.setLngLat([driverLocation.lng, driverLocation.lat]);
    }
  }, [driverLocation]);

  // Update H3 Hexagons GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateData = () => {
      const source = map.getSource('h3-hexagons') as maplibregl.GeoJSONSource;
      if (!source) return;

      const geojson = hotspotsToGeoJSON(hotspots);
      source.setData(geojson);
    };

    if (map.isStyleLoaded()) {
      updateData();
    } else {
      map.once('load', updateData);
    }
  }, [hotspots]);

  // Handle selected hotspot fly-to
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedHotspot || !selectedHotspot.latitude || !selectedHotspot.longitude) return;

    map.flyTo({
      center: [selectedHotspot.longitude, selectedHotspot.latitude],
      zoom: 13.5,
      speed: 1.2,
      curve: 1.4,
    });
  }, [selectedHotspot]);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-slate-950 overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Overlay Controls / HUD Badge */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="backdrop-blur-md bg-black/60 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-semibold tracking-wider text-emerald-300">
            H3 RES 8 SPATIAL RADAR ({radiusKm} KM)
          </span>
        </div>
        <div className="backdrop-blur-md bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-zinc-400 flex items-center gap-2">
          <span>Hexagons: {hotspots.length} active</span>
          <span>•</span>
          <span>0.7 km² per cell</span>
        </div>
      </div>

      {/* Surge Heatmap Legend */}
      <div className="absolute bottom-6 left-4 z-10 backdrop-blur-md bg-black/75 border border-white/10 rounded-xl p-3 shadow-2xl flex flex-col gap-1.5 text-xs">
        <div className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
          Surge Multiplier
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#8b5cf6]"></span>
          <span className="text-purple-300 font-mono">2.2x+ (Extreme)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#ef4444]"></span>
          <span className="text-red-300 font-mono">1.6x - 2.1x (High)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#f59e0b]"></span>
          <span className="text-amber-300 font-mono">1.3x - 1.5x (Medium)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#10b981]"></span>
          <span className="text-emerald-300 font-mono">1.0x - 1.2x (Normal)</span>
        </div>
      </div>
    </div>
  );
}
