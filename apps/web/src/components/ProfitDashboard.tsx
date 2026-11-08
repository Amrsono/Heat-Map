'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Navigation,
  Compass,
  Radio,
  Clock,
  Car,
  Zap,
  ChevronRight,
  ShieldAlert,
  Layers,
  ArrowUpRight,
  Sliders,
  Radar,
} from 'lucide-react';
import { HotspotRecord, getSurgeColor, getSurgeCategory, getBestPlatform } from '@/lib/h3-utils';
import { loadSettings } from '@/lib/settings-store';
import SettingsView from '@/components/SettingsView';

interface ProfitDashboardProps {
  hotspots: HotspotRecord[];
  selectedHotspot: HotspotRecord | null;
  onSelectHotspot: (hotspot: HotspotRecord | null) => void;
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  isLoading: boolean;
  onRefresh: () => void;
  isRealtimeActive: boolean;
}

export default function ProfitDashboard({
  hotspots,
  selectedHotspot,
  onSelectHotspot,
  radiusKm,
  onRadiusChange,
  isLoading,
  onRefresh,
  isRealtimeActive,
}: ProfitDashboardProps) {
  const [activeTab, setActiveTab] = useState<'radar' | 'settings'>('radar');

  // Sort hotspots by highest profit coefficient
  const sortedHotspots = [...hotspots].sort(
    (a, b) => b.profit_coefficient - a.profit_coefficient
  );

  const topHotspot = sortedHotspots[0];
  const maxMultiplier = topHotspot ? topHotspot.profit_coefficient : 1.0;
  const bestPlatform = topHotspot ? getBestPlatform(topHotspot) : 'Uber';

  const handleNavigate = (hotspot: HotspotRecord) => {
    if (!hotspot.latitude || !hotspot.longitude) return;
    const { navigationApp } = loadSettings();
    let url = `https://www.google.com/maps/dir/?api=1&destination=${hotspot.latitude},${hotspot.longitude}`;
    
    if (navigationApp === 'waze') {
      url = `https://waze.com/ul?ll=${hotspot.latitude},${hotspot.longitude}&navigate=yes`;
    } else if (navigationApp === 'apple') {
      url = `maps://?daddr=${hotspot.latitude},${hotspot.longitude}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#0d121f] text-slate-100 border-l border-white/10 overflow-hidden shadow-2xl">
      {/* Top Header & Tab Switcher */}
      <div className="p-3.5 border-b border-white/10 bg-[#111726]/90 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4 fill-emerald-400/20" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                SurgePilot AI
                <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Edge
                </span>
              </h1>
              <p className="text-[10px] text-zinc-400">Driver Profit Optimization</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                isRealtimeActive
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}
            >
              <Radio className={`w-2.5 h-2.5 ${isRealtimeActive ? 'animate-pulse text-emerald-400' : ''}`} />
              {isRealtimeActive ? 'Live' : 'Polling'}
            </span>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('radar')}
            className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'radar'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            Radar HUD
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Settings & APIs
          </button>
        </div>
      </div>

      {/* Tab 1: Settings View */}
      {activeTab === 'settings' ? (
        <div className="flex-1 overflow-hidden">
          <SettingsView />
        </div>
      ) : (
        /* Tab 2: Radar View */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Summary Metrics Cards */}
          <div className="p-3 border-b border-white/10 bg-[#111726]/40">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#172033] rounded-xl p-2.5 border border-white/5">
                <div className="text-[10px] text-zinc-400 uppercase font-mono flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" /> Max Surge
                </div>
                <div className="text-base font-black text-white mt-1">
                  {maxMultiplier.toFixed(2)}x
                </div>
              </div>

              <div className="bg-[#172033] rounded-xl p-2.5 border border-white/5">
                <div className="text-[10px] text-zinc-400 uppercase font-mono flex items-center gap-1">
                  <Car className="w-3 h-3 text-amber-400" /> Best App
                </div>
                <div className="text-base font-black text-amber-300 mt-1">
                  {bestPlatform}
                </div>
              </div>

              <div className="bg-[#172033] rounded-xl p-2.5 border border-white/5">
                <div className="text-[10px] text-zinc-400 uppercase font-mono flex items-center gap-1">
                  <Compass className="w-3 h-3 text-cyan-400" /> Hotspots
                </div>
                <div className="text-base font-black text-cyan-300 mt-1">
                  {hotspots.length}
                </div>
              </div>
            </div>

            {/* Radius Filter & Refresh */}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-zinc-400 mr-1 font-medium">Radar:</span>
                {[3, 5, 10, 15].map((km) => (
                  <button
                    key={km}
                    onClick={() => onRadiusChange(km)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                      radiusKm === km
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                        : 'bg-[#172033] text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {km}km
                  </button>
                ))}
              </div>

              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="px-2 py-0.5 text-xs rounded-lg bg-[#172033] hover:bg-[#1e2a42] border border-white/10 text-zinc-300 flex items-center gap-1 transition-all disabled:opacity-50"
              >
                <Clock className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Sync
              </button>
            </div>
          </div>

          {/* Selected Hotspot Deep Dive Card (if any) */}
          {selectedHotspot && (
            <div className="p-3.5 bg-gradient-to-br from-[#18233b] to-[#121a2c] border-b border-emerald-500/20 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      Hex {selectedHotspot.h3_index.substring(0, 8)}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {selectedHotspot.distance_meters
                        ? `${(selectedHotspot.distance_meters / 1000).toFixed(1)} km away`
                        : 'Near you'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <h3 className="text-xs font-bold text-white">
                      {selectedHotspot.primary_demand_driver?.split('•')[0] || 'High Passenger Cluster'}
                    </h3>
                    {selectedHotspot.primary_demand_driver?.includes('ETA') && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/50 px-2.5 py-1 rounded-lg w-fit shadow-md">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {selectedHotspot.primary_demand_driver.split('•')[1]?.trim()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className="text-lg font-black px-2 py-0.5 rounded-lg inline-block shadow-lg"
                    style={{
                      backgroundColor: `${getSurgeColor(selectedHotspot.profit_coefficient)}25`,
                      color: getSurgeColor(selectedHotspot.profit_coefficient),
                    }}
                  >
                    {selectedHotspot.profit_coefficient.toFixed(2)}x
                  </span>
                </div>
              </div>

              {/* Demand score meters */}
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                <div className="bg-black/30 rounded-lg p-1.5 border border-white/5">
                  <div className="text-[9px] text-zinc-400">Uber</div>
                  <div className="text-xs font-bold text-emerald-400">
                    {selectedHotspot.active_uber_demand_score}%
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg p-1.5 border border-white/5">
                  <div className="text-[9px] text-zinc-400">DiDi</div>
                  <div className="text-xs font-bold text-amber-400">
                    {selectedHotspot.active_didi_demand_score}%
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg p-1.5 border border-white/5">
                  <div className="text-[9px] text-zinc-400">inDrive</div>
                  <div className="text-xs font-bold text-blue-400">
                    {selectedHotspot.active_indrive_demand_score}%
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => handleNavigate(selectedHotspot)}
                  className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Navigation className="w-3 h-3" />
                  Navigate GPS
                </button>
                <button
                  onClick={() => onSelectHotspot(null)}
                  className="py-1.5 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Hotspots Ranking List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold px-1">
              <span>PRIORITY SURGE HEXAGONS</span>
              <span>{sortedHotspots.length} LOCATIONS</span>
            </div>

            {sortedHotspots.length === 0 ? (
              <div className="text-center py-10 px-4 text-zinc-500 text-xs">
                No hotspots located within {radiusKm} km. Try increasing your radar radius.
              </div>
            ) : (
              sortedHotspots.map((item, idx) => {
                const isSelected = selectedHotspot?.h3_index === item.h3_index;
                const category = getSurgeCategory(item.profit_coefficient);
                const hexColor = getSurgeColor(item.profit_coefficient);

                return (
                  <div
                    key={item.id || item.h3_index}
                    onClick={() => onSelectHotspot(item)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#18233b] border-emerald-500 shadow-lg'
                        : 'bg-[#131a29] border-white/5 hover:border-white/20 hover:bg-[#162033]'
                    }`}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: hexColor }}
                    />

                    <div className="pl-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-black/40 text-[9px] font-mono text-zinc-400 flex items-center justify-center font-bold">
                            #{idx + 1}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${category.bgColor} ${category.textColor} border ${category.borderColor}`}>
                            {category.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className="text-sm font-black px-1.5 py-0.5 rounded-lg"
                            style={{
                              backgroundColor: `${hexColor}20`,
                              color: hexColor,
                            }}
                          >
                            {item.profit_coefficient.toFixed(2)}x
                          </span>
                        </div>
                      </div>

                      {(() => {
                        const raw = item.primary_demand_driver || 'Zone Demand Influx';
                        const parts = raw.split('•');
                        const flightName = parts[0].trim();
                        const etaRaw = parts[1]?.trim() ?? null;
                        // Extract just the time portion e.g. "🛬 ETA 09:45 PM"
                        const etaMatch = etaRaw?.match(/(?:🛬\s*)?ETA\s+(\d{1,2}:\d{2}\s*[AP]M)/i);
                        const etaTime = etaMatch ? etaMatch[1] : null;
                        return (
                          <>
                            <div className="mt-1.5 text-xs font-semibold text-white leading-tight">
                              {flightName}
                            </div>
                            {etaTime && (
                              <div className="mt-1 inline-flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                                🛬 ETA {etaTime}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="font-mono text-zinc-500">
                          H3: {item.h3_index.substring(0, 9)}
                        </span>
                        <span>
                          {item.distance_meters
                            ? `${(item.distance_meters / 1000).toFixed(1)} km`
                            : `${(1 + idx * 0.8).toFixed(1)} km`}
                        </span>
                      </div>

                      {/* Multi-platform micro bar */}
                      <div className="mt-2 pt-1.5 border-t border-white/5 grid grid-cols-3 gap-1 text-[9px]">
                        <div className="flex items-center justify-between bg-black/30 px-1 py-0.5 rounded">
                          <span className="text-zinc-500">Uber</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {item.active_uber_demand_score}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-black/30 px-1 py-0.5 rounded">
                          <span className="text-zinc-500">DiDi</span>
                          <span className="font-mono font-bold text-amber-400">
                            {item.active_didi_demand_score}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-black/30 px-1 py-0.5 rounded">
                          <span className="text-zinc-500">inDrive</span>
                          <span className="font-mono font-bold text-blue-400">
                            {item.active_indrive_demand_score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Footer Info */}
          <div className="p-2.5 border-t border-white/10 bg-[#090d16] text-[10px] text-zinc-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-zinc-400" />
              Vertex AI 30m Forecast
            </span>
            <span className="text-[9px] text-zinc-600 font-mono">
              Edge: 15s cache
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
