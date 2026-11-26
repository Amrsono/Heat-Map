'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Navigation,
  MapPin,
  RefreshCw,
  CloudSun,
  AlertTriangle,
  Car,
  Clock,
  ShieldCheck,
  ExternalLink,
  Target,
  TrendingUp,
  Globe,
  Sliders,
} from 'lucide-react';
import { HotspotRecord } from '@/lib/h3-utils';
import { loadSettings } from '@/lib/settings-store';
import type {
  AIInsightsResponse,
  AIRecommendation,
  TargetPlatform,
} from '@/lib/ai-insights-engine';

interface AIInsightsViewProps {
  driverLocation: { lat: number; lng: number };
  radiusKm: number;
  hotspots: HotspotRecord[];
  onRecommendationsLoaded: (recs: AIRecommendation[]) => void;
  selectedAiTarget: AIRecommendation | null;
  onSelectAiTarget: (rec: AIRecommendation | null) => void;
  onOpenSettings: () => void;
}

export default function AIInsightsView({
  driverLocation,
  radiusKm,
  hotspots,
  onRecommendationsLoaded,
  selectedAiTarget,
  onSelectAiTarget,
  onOpenSettings,
}: AIInsightsViewProps) {
  const [platformFocus, setPlatformFocus] = useState<TargetPlatform>('both');
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hotspotsRef = useRef<HotspotRecord[]>(hotspots);
  hotspotsRef.current = hotspots;
  const onLoadedRef = useRef(onRecommendationsLoaded);
  onLoadedRef.current = onRecommendationsLoaded;

  useEffect(() => {
    const s = loadSettings();
    if (s.preferredPlatform) {
      setPlatformFocus(s.preferredPlatform);
    }
  }, []);

  const fetchAIInsights = useCallback(
    async (overridePlatform?: TargetPlatform) => {
      setIsLoading(true);
      setErrorMsg(null);
      const settings = loadSettings();
      const targetPlatform = overridePlatform || platformFocus;

      try {
        const res = await fetch('/api/ai-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: driverLocation.lat,
            lng: driverLocation.lng,
            radiusKm,
            platformFocus: targetPlatform,
            geminiApiKey: settings.geminiApiKey || '',
            enableSearchGrounding: settings.enableLiveSearchGrounding,
            flightStatsApiKey: settings.flightStatsApiKey || '',
            hotspots: hotspotsRef.current.slice(0, 10),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Unable to generate AI insights.');
        }

        setInsights(data as AIInsightsResponse);
        onLoadedRef.current(data.recommendations || []);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to reach AI Profit Advisor.');
      } finally {
        setIsLoading(false);
      }
    },
    [driverLocation.lat, driverLocation.lng, radiusKm, platformFocus]
  );

  // Auto-analyze when opening AI Insights or switching location/radius
  useEffect(() => {
    fetchAIInsights();
  }, [fetchAIInsights]);

  const handleNavigate = (rec: AIRecommendation) => {
    const { navigationApp } = loadSettings();
    let url = `https://www.google.com/maps/dir/?api=1&destination=${rec.lat},${rec.lng}`;
    if (navigationApp === 'waze') {
      url = `https://waze.com/ul?ll=${rec.lat},${rec.lng}&navigate=yes`;
    } else if (navigationApp === 'apple') {
      url = `maps://?daddr=${rec.lat},${rec.lng}`;
    }
    window.open(url, '_blank');
  };

  const getPlatformBadgeStyle = (plat: AIRecommendation['recommendedPlatform']) => {
    if (plat === 'Uber') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (plat === 'DiDi') {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    return 'bg-violet-500/20 text-violet-300 border-violet-500/40';
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0d121f] p-3 space-y-3">
      {/* Top Control & Platform Switcher */}
      <div className="bg-[#131a29] border border-violet-500/25 rounded-2xl p-3 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">AI Profit Advisor</div>
              <div className="text-[10px] text-zinc-400">
                Immediate high-earnings move advisor
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchAIInsights()}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md shadow-violet-600/25 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analyzing...' : 'Analyze Now'}
          </button>
        </div>

        {/* Platform Filter Pills */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
          {(
            [
              { id: 'both', label: 'Uber + DiDi' },
              { id: 'uber', label: 'Uber Only' },
              { id: 'didi', label: 'DiDi Only' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setPlatformFocus(item.id);
              }}
              className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                platformFocus === item.id
                  ? 'bg-violet-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Live Telemetry Context Strip */}
        {insights && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-zinc-300">
              <MapPin className="w-2.5 h-2.5 text-emerald-400" />
              {insights.driverArea}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-cyan-300">
              <CloudSun className="w-2.5 h-2.5 text-cyan-400" />
              {insights.weather.temperatureC !== null ? `${Math.round(insights.weather.temperatureC)}°C • ` : ''}
              {insights.weather.conditionLabel}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono ${
                insights.engine === 'gemini-grounded'
                  ? 'bg-violet-950/70 border-violet-500/40 text-violet-300'
                  : insights.engine === 'gemini-direct'
                  ? 'bg-blue-950/70 border-blue-500/40 text-blue-300'
                  : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <Globe className="w-2.5 h-2.5" />
              {insights.engine === 'gemini-grounded'
                ? 'Gemini AI + Live Search'
                : insights.engine === 'gemini-direct'
                ? 'Gemini AI Live'
                : 'Live Telemetry Engine'}
            </span>
          </div>
        )}
      </div>

      {/* Optional Gemini Key Prompt if running on Telemetry Fallback */}
      {insights && insights.engine === 'telemetry-engine' && (
        <div className="p-2.5 rounded-xl bg-violet-950/30 border border-violet-500/25 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-violet-200/90 leading-snug">
            Add a free <strong>Gemini API Key</strong> in Settings to unlock live Google Search event detection (concerts, matches &amp; rush alerts).
          </span>
          <button
            onClick={onOpenSettings}
            className="px-2 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200 font-semibold whitespace-nowrap flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            Add Key
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading && !insights && (
        <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-zinc-400">
          <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-violet-300">
            Scanning weather, venues, flights &amp; surge ratios...
          </span>
        </div>
      )}

      {insights && (
        <>
          {/* Immediate Tactical Verdict Card */}
          <div className="bg-gradient-to-br from-[#19233c] to-[#121829] border border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Immediate Move Verdict
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {insights.localTimeLabel}
              </span>
            </div>

            <p className="text-xs font-semibold text-white leading-relaxed">
              {insights.headlineAdvice}
            </p>

            {/* Uber vs DiDi Strategy Split */}
            <div className="grid grid-cols-1 gap-1.5 pt-1">
              <div className="bg-black/35 border border-emerald-500/20 rounded-xl p-2 text-[11px]">
                <span className="font-bold text-emerald-400 mr-1.5">UBER:</span>
                <span className="text-zinc-300">{insights.platformStrategy.uber}</span>
              </div>
              <div className="bg-black/35 border border-amber-500/20 rounded-xl p-2 text-[11px]">
                <span className="font-bold text-amber-400 mr-1.5">DIDI:</span>
                <span className="text-zinc-300">{insights.platformStrategy.didi}</span>
              </div>
            </div>

            {/* Caution / Avoid Alert */}
            <div className="bg-red-950/30 border border-red-500/25 rounded-xl p-2 text-[11px] flex items-start gap-1.5 text-red-200">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <span>
                <strong className="text-red-300">Avoid:</strong> {insights.avoidAlert}
              </span>
            </div>
          </div>

          {/* Ranked Recommended Destinations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-zinc-400">
              <span>TOP LOCATIONS TO HEAD TO NOW</span>
              <span>{insights.recommendations.length} TARGETS</span>
            </div>

            {insights.recommendations.map((rec) => {
              const isSelected =
                selectedAiTarget?.rank === rec.rank &&
                selectedAiTarget?.locationName === rec.locationName;

              return (
                <div
                  key={`${rec.rank}-${rec.h3Index}-${rec.locationName}`}
                  className={`rounded-2xl border p-3 transition-all space-y-2 ${
                    isSelected
                      ? 'bg-[#1a2540] border-violet-400 shadow-lg shadow-violet-500/10'
                      : 'bg-[#131a29] border-white/10 hover:border-violet-500/40'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded-md bg-violet-500 text-white text-[10px] font-black font-mono">
                          #{rec.rank}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPlatformBadgeStyle(
                            rec.recommendedPlatform
                          )}`}
                        >
                          <Car className="w-2.5 h-2.5 inline mr-1" />
                          {rec.recommendedPlatform}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {rec.distanceKm} km • ~{rec.driveTimeMins}m drive
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white leading-snug">
                        {rec.locationName}
                      </h4>
                      <div className="text-[10px] text-zinc-400">{rec.zone}</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black">
                        {rec.estimatedSurge}
                      </div>
                      <div className="text-[10px] text-cyan-300 font-mono mt-1">
                        {rec.confidencePct}% match
                      </div>
                    </div>
                  </div>

                  {/* Why Now & Staging */}
                  <div className="space-y-1.5 text-[11px]">
                    <p className="text-zinc-200 leading-relaxed">{rec.whyNow}</p>

                    <div className="bg-black/35 rounded-xl p-2 border border-white/5 space-y-1">
                      <div className="text-emerald-300">
                        <strong className="font-semibold">Staging Pin:</strong>{' '}
                        <span className="text-zinc-300">{rec.stagingAdvice}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400 pt-0.5">
                        <span className="flex items-center gap-1 text-cyan-300">
                          <Clock className="w-3 h-3" /> {rec.timeWindow}
                        </span>
                        <span className="text-amber-300 font-semibold">
                          {rec.estimatedEarningsBoost}
                        </span>
                      </div>
                    </div>

                    {rec.cautionTip && (
                      <div className="text-[10px] text-zinc-400 flex items-start gap-1">
                        <ShieldCheck className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>{rec.cautionTip}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => onSelectAiTarget(rec)}
                      className="py-1.5 px-2.5 rounded-xl bg-[#1c2842] hover:bg-[#253558] border border-violet-500/40 text-violet-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Target className="w-3.5 h-3.5 text-violet-400" />
                      Show on Map
                    </button>
                    <button
                      onClick={() => handleNavigate(rec)}
                      className="py-1.5 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Navigate GPS
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grounding Sources (when Google Search Grounding returned live URLs) */}
          {insights.groundingSources.length > 0 && (
            <div className="bg-[#131a29] border border-white/10 rounded-2xl p-3 space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-violet-300 font-bold">
                Live Web Grounding Sources
              </div>
              <div className="flex flex-wrap gap-1.5">
                {insights.groundingSources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-[10px] text-zinc-300 max-w-full truncate"
                  >
                    <ExternalLink className="w-2.5 h-2.5 text-violet-400 flex-shrink-0" />
                    <span className="truncate">{src.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Telemetry Signal Diagnostics */}
          <div className="text-[10px] text-zinc-500 flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
            <span>
              Signals: {insights.signalsUsed.weatherLive ? 'Live Weather ✓' : 'Weather Est.'} •{' '}
              {insights.signalsUsed.osmPoisCount} OSM Venues •{' '}
              {insights.signalsUsed.liveFlightsCount} Flights •{' '}
              {insights.signalsUsed.radarHotspotsCount} Radar Hexes
            </span>
          </div>
        </>
      )}
    </div>
  );
}
