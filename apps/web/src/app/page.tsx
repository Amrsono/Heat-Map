'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ProfitDashboard from '@/components/ProfitDashboard';
import SJSplashScreen from '@/components/SJSplashScreen';
import { HotspotRecord } from '@/lib/h3-utils';
import { supabase } from '@/lib/supabase-client';
import { loadSettings } from '@/lib/settings-store';
import { Geolocation } from '@capacitor/geolocation';
import { Locate, Menu, X, Sparkles, MapPin, Sliders } from 'lucide-react';

// Dynamically import MapWrapper to prevent SSR WebGL canvas issues
const MapWrapper = dynamic(() => import('@/components/MapWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#090d16] text-zinc-400 gap-3">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
        Initializing WebGL H3 Vector Canvas...
      </p>
    </div>
  ),
});

const DEMO_PRESETS = [
  { name: 'Cairo Downtown', lat: 30.0444, lng: 31.2357 },
  { name: 'Cairo Airport (CAI)', lat: 30.1219, lng: 31.4056 },
  { name: 'Sphinx Airport (SPX)', lat: 30.1147, lng: 30.8992 },
  { name: 'Cairo Intl Stadium', lat: 30.0694, lng: 31.3122 },
  { name: 'New Cairo Tech Hub', lat: 30.0074, lng: 31.4913 },
];

export default function DriverMapPage() {
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number }>({
    lat: 30.0444,
    lng: 31.2357,
  });
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Fetch hotspots from Edge API Route
  const fetchHotspots = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/heatmap?lat=${driverLocation.lat}&lng=${driverLocation.lng}&radius=${radiusKm}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.hotspots && Array.isArray(data.hotspots)) {
          setHotspots(data.hotspots);
        }
      }
    } catch (err) {
      console.error('Failed to fetch heatmap data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [driverLocation.lat, driverLocation.lng, radiusKm]);

  const requestLocationAndCenter = async () => {
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location === 'granted' || permission.coarseLocation === 'granted') {
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        setDriverLocation({
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude,
        });
        return;
      }
    } catch (e) {
      console.warn('Capacitor Geolocation permission request failed:', e);
    }

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDriverLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Browser geolocation failed:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  };

  // Request driver geolocation on initial mount
  useEffect(() => {
    requestLocationAndCenter();
  }, []);

  // Load user settings on mount and listen for dynamic updates
  useEffect(() => {
    const s = loadSettings();
    if (s.defaultRadiusKm) setRadiusKm(s.defaultRadiusKm);

    const onSettingsChange = (e: any) => {
      if (e.detail?.defaultRadiusKm) {
        setRadiusKm(e.detail.defaultRadiusKm);
      }
    };
    window.addEventListener('surgepilot_settings_changed', onSettingsChange);
    return () => window.removeEventListener('surgepilot_settings_changed', onSettingsChange);
  }, []);

  // Auto-refresh interval if configured
  useEffect(() => {
    const s = loadSettings();
    if (!s.autoRefreshIntervalSeconds || s.autoRefreshIntervalSeconds <= 0) return;
    const interval = setInterval(() => {
      fetchHotspots();
    }, s.autoRefreshIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [fetchHotspots]);

  // Fetch on location or radius change
  useEffect(() => {
    fetchHotspots();
  }, [fetchHotspots]);

  // Supabase Realtime Subscription setup
  useEffect(() => {
    const channel = supabase
      .channel('realtime_live_profit_hotspots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_profit_hotspots' },
        (payload) => {
          console.log('Realtime hotspot update received:', payload);
          // Refetch fresh nearby hotspots
          fetchHotspots();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        } else {
          setIsRealtimeActive(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHotspots]);

  const handleRecenter = () => {
    requestLocationAndCenter();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden flex flex-col md:flex-row bg-[#090d16]">
      {showSplash && <SJSplashScreen onFinished={() => setShowSplash(false)} />}
      {/* Map Section (Mobile: full, Desktop: 68%) */}
      <section className="relative w-full h-full md:w-[68%] lg:w-[72%] flex-1">
        <MapWrapper
          driverLocation={driverLocation}
          hotspots={hotspots}
          selectedHotspot={selectedHotspot}
          onSelectHotspot={(hotspot) => {
            setSelectedHotspot(hotspot);
            if (hotspot && window.innerWidth < 768) {
              setIsMobileDrawerOpen(true);
            }
          }}
          radiusKm={radiusKm}
        />

        {/* Floating Quick Preset Location Selector */}
        <div className="absolute top-4 right-14 z-10 flex items-center gap-1.5 backdrop-blur-md bg-black/60 border border-white/10 rounded-xl p-1.5 shadow-xl max-w-[calc(100vw-120px)] overflow-x-auto">
          <MapPin className="w-3.5 h-3.5 text-zinc-400 ml-1 flex-shrink-0" />
          {DEMO_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setDriverLocation({ lat: p.lat, lng: p.lng });
                setSelectedHotspot(null);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all flex-shrink-0 ${
                driverLocation.lat === p.lat && driverLocation.lng === p.lng
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Floating Recenter GPS Button */}
        <button
          onClick={handleRecenter}
          title="Recenter on My Location"
          className="absolute bottom-6 right-4 z-10 w-11 h-11 rounded-xl bg-black/70 hover:bg-emerald-600 border border-white/20 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all group"
        >
          <Locate className="w-5 h-5 group-hover:scale-110 transition-transform text-emerald-400 group-hover:text-black" />
        </button>

        {/* Mobile Toggle Button for Dashboard Drawer */}
        <button
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-300/30"
        >
          {isMobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          {isMobileDrawerOpen ? 'Close Radar Sheet' : `View Radar (${hotspots.length})`}
        </button>
      </section>

      {/* Desktop Sidebar (32%) */}
      <aside className="hidden md:block md:w-[32%] lg:w-[28%] h-full z-10">
        <ProfitDashboard
          hotspots={hotspots}
          selectedHotspot={selectedHotspot}
          onSelectHotspot={setSelectedHotspot}
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          isLoading={isLoading}
          onRefresh={fetchHotspots}
          isRealtimeActive={isRealtimeActive}
          driverLocation={driverLocation}
        />
      </aside>

      {/* Mobile Drawer (Slide up when opened) */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 top-16 z-30 transition-transform duration-300 ease-in-out ${
          isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <ProfitDashboard
          hotspots={hotspots}
          selectedHotspot={selectedHotspot}
          onSelectHotspot={setSelectedHotspot}
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          isLoading={isLoading}
          onRefresh={fetchHotspots}
          isRealtimeActive={isRealtimeActive}
          driverLocation={driverLocation}
        />
      </div>
    </main>
  );
}
