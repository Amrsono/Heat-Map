import { cellToBoundary, latLngToCell, cellToLatLng } from 'h3-js';

export interface HotspotRecord {
  id?: string;
  h3_index: string;
  profit_coefficient: number;
  active_uber_demand_score: number;
  active_didi_demand_score: number;
  active_indrive_demand_score: number;
  primary_demand_driver?: string;
  updated_at?: string;
  city_zone?: string;
  latitude?: number;
  longitude?: number;
  distance_meters?: number;
}

export interface HexFeatureProperties extends HotspotRecord {
  color: string;
  opacity: number;
  bestPlatform: 'Uber' | 'DiDi' | 'inDrive';
}

/**
 * Returns color matching the surge multiplier range
 * 1.0 - 1.2x: Green / Cyan (#10b981)
 * 1.25 - 1.55x: Amber (#f59e0b)
 * 1.6 - 2.1x: Red / Coral (#ef4444)
 * 2.2x+: Purple / Ultraviolet (#8b5cf6)
 */
export function getSurgeColor(coefficient: number): string {
  if (coefficient >= 2.2) return '#8b5cf6'; // Violet / extreme
  if (coefficient >= 1.6) return '#ef4444'; // Red / high
  if (coefficient >= 1.25) return '#f59e0b'; // Amber / medium
  return '#10b981'; // Green / normal
}

export function getSurgeCategory(coefficient: number): {
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
} {
  if (coefficient >= 2.2) {
    return {
      label: 'EXTREME SURGE',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-950/60',
      borderColor: 'border-purple-500/40',
    };
  }
  if (coefficient >= 1.6) {
    return {
      label: 'HIGH SURGE',
      textColor: 'text-red-400',
      bgColor: 'bg-red-950/60',
      borderColor: 'border-red-500/40',
    };
  }
  if (coefficient >= 1.25) {
    return {
      label: 'MODERATE SURGE',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-950/60',
      borderColor: 'border-amber-500/40',
    };
  }
  return {
    label: 'BASE DEMAND',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-950/60',
    borderColor: 'border-emerald-500/40',
  };
}

export function getBestPlatform(item: HotspotRecord): 'Uber' | 'DiDi' | 'inDrive' {
  const scores = [
    { name: 'Uber' as const, score: item.active_uber_demand_score || 0 },
    { name: 'DiDi' as const, score: item.active_didi_demand_score || 0 },
    { name: 'inDrive' as const, score: item.active_indrive_demand_score || 0 },
  ];
  scores.sort((a, b) => b.score - a.score);
  return scores[0].name;
}

/**
 * Resolves precise airport terminal coordinates for flight notifications,
 * or falls back to hotspot coordinates for standard zones.
 */
export function getNavigationCoordinates(hotspot: HotspotRecord): { lat: number; lng: number } {
  const driver = (hotspot.primary_demand_driver || hotspot.city_zone || '').toLowerCase();

  if (driver.includes('sphinx') || driver.includes('spx') || driver.includes('w6') || driver.includes('pyramids tourist')) {
    return { lat: 30.1147, lng: 30.8992 }; // Sphinx International Airport (SPX)
  }
  if (driver.includes('terminal 2') || driver.includes('ek927')) {
    return { lat: 30.1190, lng: 31.4010 }; // Cairo Airport Terminal 2
  }
  if (driver.includes('terminal 3') || driver.includes('ms777') || driver.includes('airport') || driver.includes('flight') || driver.includes('aviation')) {
    return { lat: 30.1219, lng: 31.4056 }; // Cairo Airport Terminal 3
  }

  return {
    lat: hotspot.latitude ?? 30.0444,
    lng: hotspot.longitude ?? 31.2357,
  };
}

/**
 * Converts a list of Hotspot records into GeoJSON FeatureCollection
 * of H3 Resolution 8 hexagons.
 */
export function hotspotsToGeoJSON(hotspots: HotspotRecord[]): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  for (const hotspot of hotspots) {
    try {
      // cellToBoundary returns array of [lat, lng] coordinates
      const boundary = cellToBoundary(hotspot.h3_index);
      
      // GeoJSON expects [lng, lat] order
      const coordinates = boundary.map(([lat, lng]) => [lng, lat]);
      // Close polygon loop if not closed
      if (
        coordinates.length > 0 &&
        (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
         coordinates[0][1] !== coordinates[coordinates.length - 1][1])
      ) {
        coordinates.push([...coordinates[0]]);
      }

      const color = getSurgeColor(hotspot.profit_coefficient);
      const bestPlatform = getBestPlatform(hotspot);

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
        properties: {
          ...hotspot,
          color,
          opacity: 0.45,
          bestPlatform,
        },
      });
    } catch (e) {
      console.warn(`Failed to generate polygon for H3 index ${hotspot.h3_index}`, e);
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export { cellToBoundary, latLngToCell, cellToLatLng };
