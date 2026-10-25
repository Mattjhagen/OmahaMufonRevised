import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { SightingReport, SightingType } from '../types';
import {
  Clock,
  Compass,
  MapPin,
  BarChart3,
  Moon,
  Sun,
  Flame,
  Radio,
  Filter,
  X,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

export interface FilterCriteria {
  hour?: number | null; // Selected local hour (0-23)
  sector?: string | null; // Selected geographic cluster
  timeWindow?: 'day' | 'twilight' | 'nocturnal' | null;
}

interface SightingsD3AnalyticsProps {
  sightings: SightingReport[];
  activeFilter: FilterCriteria;
  onFilterChange: (filter: FilterCriteria) => void;
}

// Geographic sector definitions for Greater Omaha
export interface GeoSector {
  id: string;
  name: string;
  description: string;
  centerLat: number;
  centerLon: number;
  color: string;
}

export const OMAHA_SECTORS: GeoSector[] = [
  {
    id: 'offutt_bellevue',
    name: 'Bellevue / Offutt AFB Corridor',
    description: 'Offutt AFB restricted airspace & Missouri River South Bluffs',
    centerLat: 41.12,
    centerLon: -95.92,
    color: '#06b6d4', // cyan-500
  },
  {
    id: 'eppley_river',
    name: 'Eppley Airfield / North River Corridor',
    description: 'Commercial approach lanes & river valley bluffs',
    centerLat: 41.29,
    centerLon: -95.91,
    color: '#3b82f6', // blue-500
  },
  {
    id: 'west_elkhorn',
    name: 'Elkhorn / West Dodge Corridor',
    description: 'High elevation western ridgeline & Skyline Drive pastures',
    centerLat: 41.28,
    centerLon: -96.23,
    color: '#8b5cf6', // purple-500
  },
  {
    id: 'sarpy_papillion',
    name: 'Papillion / Chalco / Sarpy Basin',
    description: 'Wehrspann Lake, Chalco Hills, and Shadow Lake basin',
    centerLat: 41.16,
    centerLon: -96.06,
    color: '#10b981', // emerald-500
  },
  {
    id: 'north_bennington',
    name: 'North Douglas / Bennington Rural',
    description: 'Dark-sky agricultural border & Bennington Reservoir',
    centerLat: 41.34,
    centerLon: -96.17,
    color: '#f59e0b', // amber-500
  },
  {
    id: 'loess_hills',
    name: 'Council Bluffs / Loess Hills Ridge',
    description: 'Eastern Iowa loess bluffs & Fairmont Park vantage points',
    centerLat: 41.25,
    centerLon: -95.84,
    color: '#ec4899', // pink-500
  },
];

// Determine which sector a sighting falls into by nearest distance
export function getSightingSector(lat: number, lon: number): GeoSector {
  let bestSector = OMAHA_SECTORS[0];
  let minDistance = Infinity;

  for (const sector of OMAHA_SECTORS) {
    const dLat = lat - sector.centerLat;
    const dLon = lon - sector.centerLon;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < minDistance) {
      minDistance = distSq;
      bestSector = sector;
    }
  }
  return bestSector;
}

// Time of day classification
export function getTimeClassification(hour: number): 'day' | 'twilight' | 'nocturnal' {
  if (hour >= 6 && hour < 18) return 'day';
  if ((hour >= 18 && hour < 21) || (hour >= 4 && hour < 6)) return 'twilight';
  return 'nocturnal'; // 21:00 - 04:00
}

export const SightingsD3Analytics: React.FC<SightingsD3AnalyticsProps> = ({
  sightings,
  activeFilter,
  onFilterChange,
}) => {
  const [activeTab, setActiveTab] = useState<'diurnal' | 'geo' | 'morphology'>('diurnal');
  const [useLocalTime, setUseLocalTime] = useState<boolean>(true);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: React.ReactNode;
  } | null>(null);

  const diurnalSvgRef = useRef<SVGSVGElement | null>(null);
  const geoSvgRef = useRef<SVGSVGElement | null>(null);
  const morphologySvgRef = useRef<SVGSVGElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Measure container width responsively
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Process data with local/UTC hour assignment
  const processedSightings = useMemo(() => {
    return sightings.map((s) => {
      const d = new Date(s.sighting_time);
      // Local Omaha time (America/Chicago) vs UTC
      const hour = useLocalTime ? d.getHours() : d.getUTCHours();
      const sector = getSightingSector(s.lat, s.lon);
      const timeClass = getTimeClassification(hour);
      return {
        ...s,
        analysisHour: hour,
        sector,
        timeClass,
      };
    });
  }, [sightings, useLocalTime]);

  // Diurnal summary statistics
  const diurnalStats = useMemo(() => {
    const hourlyCounts = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      unmatched: 0,
      correlated: 0,
      total: 0,
      sightings: [] as typeof processedSightings,
    }));

    let dayCount = 0;
    let twilightCount = 0;
    let nocturnalCount = 0;

    for (const s of processedSightings) {
      const h = s.analysisHour;
      if (hourlyCounts[h]) {
        hourlyCounts[h].total += 1;
        hourlyCounts[h].sightings.push(s);
        if (s.correlation_status === 'correlated') {
          hourlyCounts[h].correlated += 1;
        } else {
          hourlyCounts[h].unmatched += 1;
        }
      }

      if (s.timeClass === 'day') dayCount++;
      else if (s.timeClass === 'twilight') twilightCount++;
      else nocturnalCount++;
    }

    // Find peak hour
    let peakHour = 0;
    let maxHourCount = 0;
    for (const h of hourlyCounts) {
      if (h.total > maxHourCount) {
        maxHourCount = h.total;
        peakHour = h.hour;
      }
    }

    return {
      hourlyCounts,
      dayCount,
      twilightCount,
      nocturnalCount,
      peakHour,
      maxHourCount,
      total: processedSightings.length,
    };
  }, [processedSightings]);

  // Sector breakdown stats
  const sectorStats = useMemo(() => {
    const map = new Map<
      string,
      {
        sector: GeoSector;
        count: number;
        unmatched: number;
        correlated: number;
        sightings: typeof processedSightings;
      }
    >();

    for (const s of OMAHA_SECTORS) {
      map.set(s.id, {
        sector: s,
        count: 0,
        unmatched: 0,
        correlated: 0,
        sightings: [],
      });
    }

    for (const s of processedSightings) {
      const entry = map.get(s.sector.id);
      if (entry) {
        entry.count++;
        entry.sightings.push(s);
        if (s.correlation_status === 'correlated') entry.correlated++;
        else entry.unmatched++;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [processedSightings]);

  // -------------------------------------------------------------
  // D3 RENDER 1: 24-HOUR DIURNAL FREQUENCY HISTOGRAM & DENSITY
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'diurnal' || !diurnalSvgRef.current) return;

    const svg = d3.select(diurnalSvgRef.current);
    svg.selectAll('*').remove();

    const width = Math.max(containerWidth, 540);
    const height = 280;
    const margin = { top: 30, right: 24, bottom: 44, left: 44 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale for 24 hours
    const xScale = d3
      .scaleBand<number>()
      .domain(d3.range(24))
      .range([0, innerWidth])
      .padding(0.24);

    // Y scale for frequency count
    const maxVal = Math.max(3, d3.max(diurnalStats.hourlyCounts, (d) => d.total) || 1);
    const yScale = d3.scaleLinear().domain([0, maxVal]).nice().range([innerHeight, 0]);

    // Defs for gradients & filters
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow-cyan');
    filter
      .append('feGaussianBlur')
      .attr('stdDeviation', '2.5')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradient for unmatched bars
    const unmatchedGrad = defs
      .append('linearGradient')
      .attr('id', 'unmatched-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    unmatchedGrad.append('stop').attr('offset', '0%').attr('stop-color', '#22d3ee'); // cyan-400
    unmatchedGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0891b2'); // cyan-600

    // Gradient for correlated bars
    const correlatedGrad = defs
      .append('linearGradient')
      .attr('id', 'correlated-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    correlatedGrad.append('stop').attr('offset', '0%').attr('stop-color', '#34d399'); // emerald-400
    correlatedGrad.append('stop').attr('offset', '100%').attr('stop-color', '#059669'); // emerald-600

    // Solar illumination bands background
    // Hours 0-4 (Deep Night), 4-6 (Dawn Twilight), 6-18 (Day), 18-21 (Dusk Twilight), 21-24 (Deep Night)
    const timeBands = [
      { start: 0, end: 4, name: 'Deep Night (Peak Watch)', fill: '#0f172a', opacity: 0.65 },
      { start: 4, end: 6, name: 'Astronomical / Nautical Dawn', fill: '#1e1b4b', opacity: 0.5 },
      { start: 6, end: 18, name: 'Daylight Window', fill: '#0284c7', opacity: 0.08 },
      { start: 18, end: 21, name: 'Dusk Twilight (Astronomical)', fill: '#1e1b4b', opacity: 0.5 },
      { start: 21, end: 24, name: 'Deep Night (Peak Watch)', fill: '#0f172a', opacity: 0.65 },
    ];

    timeBands.forEach((band) => {
      const x1 = (xScale(band.start) || 0) - (xScale.step() * xScale.paddingInner()) / 2;
      const x2 =
        band.end === 24
          ? innerWidth
          : (xScale(band.end) || 0) - (xScale.step() * xScale.paddingInner()) / 2;
      g.append('rect')
        .attr('x', x1)
        .attr('y', 0)
        .attr('width', Math.max(0, x2 - x1))
        .attr('height', innerHeight)
        .attr('fill', band.fill)
        .attr('opacity', band.opacity);
    });

    // Subtle horizontal gridlines
    const yAxisGrid = d3
      .axisLeft(yScale)
      .ticks(maxVal <= 5 ? maxVal : 5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '2,4')
      .attr('stroke-opacity', 0.5);

    g.select('.grid').select('.domain').remove();

    // Stacked bars: Unmatched (bottom/full) and Correlated (top portion)
    diurnalStats.hourlyCounts.forEach((d) => {
      const isSelected = activeFilter.hour === d.hour;
      const barX = xScale(d.hour) || 0;
      const barW = xScale.bandwidth();

      if (d.total === 0) {
        // Zero marker line for clarity
        g.append('line')
          .attr('x1', barX)
          .attr('x2', barX + barW)
          .attr('y1', innerHeight - 1)
          .attr('y2', innerHeight - 1)
          .attr('stroke', '#334155')
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.4);
        return;
      }

      // Height calculations
      const totalH = innerHeight - yScale(d.total);
      const correlatedH = innerHeight - yScale(d.correlated);
      const unmatchedH = totalH - correlatedH;

      // Group container for interactive bar
      const barGroup = g
        .append('g')
        .attr('class', 'cursor-pointer transition-all')
        .on('click', () => {
          if (activeFilter.hour === d.hour) {
            onFilterChange({ ...activeFilter, hour: null });
          } else {
            onFilterChange({ ...activeFilter, hour: d.hour });
          }
        })
        .on('mouseenter', (event) => {
          const target = event.currentTarget as Element | null;
          if (!target) return;
          const rect = target.getBoundingClientRect();
          const hourFormatted = `${String(d.hour).padStart(2, '0')}:00 - ${String(
            (d.hour + 1) % 24
          ).padStart(2, '0')}:00`;
          const timeLabel = useLocalTime ? `${hourFormatted} Local (CST)` : `${hourFormatted} UTC`;
          const timePhase = getTimeClassification(d.hour);

          setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 12,
            content: (
              <div className="space-y-1.5 min-w-[190px]">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
                  <span className="font-mono text-xs font-bold text-cyan-300">{timeLabel}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {timePhase}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Incidents:</span>
                    <span className="font-mono font-bold text-white">{d.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                      Unmatched / UAP:
                    </span>
                    <span className="font-mono font-semibold text-cyan-300">{d.unmatched}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      ADS-B Correlated:
                    </span>
                    <span className="font-mono font-semibold text-emerald-300">{d.correlated}</span>
                  </div>
                </div>
                {d.sightings.length > 0 && (
                  <div className="pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                    Shapes:{' '}
                    <span className="text-slate-200">
                      {Array.from(new Set(d.sightings.map((s) => s.type))).join(', ')}
                    </span>
                  </div>
                )}
                <div className="text-[10px] text-cyan-400/80 italic pt-0.5">
                  Click bar to filter archive list
                </div>
              </div>
            ),
          });
        })
        .on('mouseleave', () => setTooltip(null));

      // Unmatched bar segment (bottom)
      barGroup
        .append('rect')
        .attr('x', barX)
        .attr('y', yScale(d.unmatched))
        .attr('width', barW)
        .attr('height', unmatchedH)
        .attr('fill', 'url(#unmatched-grad)')
        .attr('rx', d.correlated === 0 ? 3 : 0)
        .attr('opacity', isSelected || activeFilter.hour === null ? 0.95 : 0.45)
        .attr('stroke', isSelected ? '#ffffff' : 'none')
        .attr('stroke-width', isSelected ? 2 : 0);

      // Correlated bar segment (stacked above unmatched)
      if (d.correlated > 0) {
        barGroup
          .append('rect')
          .attr('x', barX)
          .attr('y', yScale(d.total))
          .attr('width', barW)
          .attr('height', correlatedH)
          .attr('fill', 'url(#correlated-grad)')
          .attr('rx', 3)
          .attr('opacity', isSelected || activeFilter.hour === null ? 0.95 : 0.45)
          .attr('stroke', isSelected ? '#ffffff' : 'none')
          .attr('stroke-width', isSelected ? 2 : 0);
      }

      // Bar top label (count)
      barGroup
        .append('text')
        .attr('x', barX + barW / 2)
        .attr('y', yScale(d.total) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', isSelected ? '#38bdf8' : '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', '600')
        .text(d.total);
    });

    // Spline curve overlay for smooth diurnal density pattern
    const curvePoints: [number, number][] = diurnalStats.hourlyCounts.map((d) => [
      (xScale(d.hour) || 0) + xScale.bandwidth() / 2,
      yScale(d.total),
    ]);

    const lineGenerator = d3
      .line()
      .x((p) => p[0])
      .y((p) => p[1])
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(curvePoints)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', '3,3')
      .attr('d', lineGenerator);

    // X Axis with hour labels
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((h) => `${String(h).padStart(2, '0')}h`);

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#475569');
    xAxisGroup
      .selectAll('text')
      .attr('fill', (h) => (h === activeFilter.hour ? '#38bdf8' : '#94a3b8'))
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-weight', (h) => (h === activeFilter.hour ? 'bold' : 'normal'));
    xAxisGroup.selectAll('line').attr('stroke', '#475569');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(maxVal <= 5 ? maxVal : 5)
      .tickFormat(d3.format('d'));

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').attr('stroke', '#475569');
    yAxisGroup
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace');
    yAxisGroup.selectAll('line').attr('stroke', '#475569');

    // Axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -30)
      .attr('fill', '#64748b')
      .attr('font-size', '9px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('text-anchor', 'middle')
      .text('REPORTS / HR');

    // Peak window callout indicator
    if (diurnalStats.maxHourCount > 0) {
      const peakX = (xScale(diurnalStats.peakHour) || 0) + xScale.bandwidth() / 2;
      g.append('circle')
        .attr('cx', peakX)
        .attr('cy', yScale(diurnalStats.maxHourCount) - 18)
        .attr('r', 3)
        .attr('fill', '#f59e0b');

      g.append('text')
        .attr('x', peakX)
        .attr('y', yScale(diurnalStats.maxHourCount) - 24)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fbbf24')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'ui-monospace, monospace')
        .text('▲ PEAK');
    }
  }, [diurnalStats, activeTab, containerWidth, activeFilter.hour, useLocalTime]);

  // -------------------------------------------------------------
  // D3 RENDER 2: GEOGRAPHIC CLUSTER MATRIX & SPATIAL DENSITY
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'geo' || !geoSvgRef.current) return;

    const svg = d3.select(geoSvgRef.current);
    svg.selectAll('*').remove();

    const width = Math.max(containerWidth, 540);
    const height = 340;
    const margin = { top: 30, right: 30, bottom: 44, left: 54 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Coordinate domain encompassing Greater Omaha metro area
    // Lon: -96.35°W (Skyline/Elkhorn) to -95.78°W (Council Bluffs/Iowa)
    // Lat: 41.06°N (Offutt AFB South) to 41.42°N (Bennington/North Douglas)
    const lonExtent = [-96.35, -95.78];
    const latExtent = [41.06, 41.42];

    const xScale = d3.scaleLinear().domain(lonExtent).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(latExtent).range([innerHeight, 0]);

    // Background tactical grid
    const xGrid = d3.axisBottom(xScale).ticks(6).tickSize(-innerHeight).tickFormat(() => '');
    const yGrid = d3.axisLeft(yScale).ticks(6).tickSize(-innerWidth).tickFormat(() => '');

    g.append('g')
      .call(xGrid)
      .selectAll('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '2,4');
    g.append('g')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '2,4');

    // Omaha MUFON Station location marker (Station 1)
    const stLat = 41.2565;
    const stLon = -95.9345;
    const stX = xScale(stLon);
    const stY = yScale(stLat);

    // Concentric radar range rings (10mi, 20mi, 30mi scaled in pixels)
    [25, 55, 95].forEach((radius, i) => {
      g.append('circle')
        .attr('cx', stX)
        .attr('cy', stY)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.15 - i * 0.03)
        .attr('stroke-dasharray', '4,4');
    });

    // Station pulse center
    g.append('circle')
      .attr('cx', stX)
      .attr('cy', stY)
      .attr('r', 4.5)
      .attr('fill', '#06b6d4')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    g.append('text')
      .attr('x', stX + 8)
      .attr('y', stY + 3)
      .attr('fill', '#38bdf8')
      .attr('font-size', '9px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-weight', 'bold')
      .text('MUFON-OMA1 STATION');

    // Missouri River stylized dividing polyline
    const riverCoords: [number, number][] = [
      [-95.95, 41.42],
      [-95.92, 41.35],
      [-95.90, 41.30],
      [-95.91, 41.25],
      [-95.88, 41.18],
      [-95.89, 41.12],
      [-95.86, 41.06],
    ];
    const riverPath = d3
      .line<[number, number]>()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      .curve(d3.curveBasis);

    g.append('path')
      .datum(riverCoords)
      .attr('fill', 'none')
      .attr('stroke', '#0284c7')
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.25)
      .attr('d', riverPath);

    g.append('text')
      .attr('x', xScale(-95.9) + 4)
      .attr('y', yScale(41.37))
      .attr('fill', '#0284c7')
      .attr('font-size', '8px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('opacity', 0.6)
      .attr('transform', `rotate(15, ${xScale(-95.9)}, ${yScale(41.37)})`)
      .text('~ MISSOURI RIVER CORRIDOR ~');

    // Draw Sector Cluster Envelopes / Density Bubbles
    sectorStats.forEach((st) => {
      const isSelected = activeFilter.sector === st.sector.id;
      const cX = xScale(st.sector.centerLon);
      const cY = yScale(st.sector.centerLat);
      // Size proportional to sighting count
      const rSize = Math.max(22, 16 + st.count * 8);

      const sectorG = g
        .append('g')
        .attr('class', 'cursor-pointer')
        .on('click', () => {
          if (activeFilter.sector === st.sector.id) {
            onFilterChange({ ...activeFilter, sector: null });
          } else {
            onFilterChange({ ...activeFilter, sector: st.sector.id });
          }
        })
        .on('mouseenter', (event) => {
          const target = event.currentTarget as Element | null;
          if (!target) return;
          const rect = target.getBoundingClientRect();
          setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 12,
            content: (
              <div className="space-y-1.5 min-w-[200px]">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                  <span className="font-bold text-xs text-white">{st.sector.name}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: st.sector.color }}
                  />
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">{st.sector.description}</p>
                <div className="text-xs space-y-1 pt-1 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Observations:</span>
                    <span className="font-mono font-bold text-white">{st.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Unmatched (No ADS-B):</span>
                    <span className="font-mono text-cyan-300">{st.unmatched}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-400">ADS-B Correlated:</span>
                    <span className="font-mono text-emerald-300">{st.correlated}</span>
                  </div>
                </div>
                <div className="text-[10px] text-cyan-400 italic pt-0.5">
                  Click cluster to filter reports
                </div>
              </div>
            ),
          });
        })
        .on('mouseleave', () => setTooltip(null));

      // Sector aura circle
      sectorG
        .append('circle')
        .attr('cx', cX)
        .attr('cy', cY)
        .attr('r', rSize)
        .attr('fill', st.sector.color)
        .attr('fill-opacity', isSelected ? 0.35 : 0.12)
        .attr('stroke', st.sector.color)
        .attr('stroke-width', isSelected ? 2.5 : 1.2)
        .attr('stroke-dasharray', isSelected ? 'none' : '3,3');

      // Sector label
      sectorG
        .append('text')
        .attr('x', cX)
        .attr('y', cY - rSize - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', isSelected ? '#ffffff' : st.sector.color)
        .attr('font-size', '9px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', 'bold')
        .text(st.sector.name.split('/')[0].trim());

      // Sector count badge in middle
      sectorG
        .append('text')
        .attr('x', cX)
        .attr('y', cY + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '12px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', 'bold')
        .text(st.count);
    });

    // Individual sighting points scattered across coordinates
    processedSightings.forEach((s) => {
      const sX = xScale(s.lon);
      const sY = yScale(s.lat);
      const isCorrelated = s.correlation_status === 'correlated';
      const isSectorActive = activeFilter.sector ? s.sector.id === activeFilter.sector : true;

      const pGroup = g
        .append('g')
        .attr('class', 'cursor-pointer')
        .on('mouseenter', (event) => {
          const target = event.currentTarget as Element | null;
          if (!target) return;
          const rect = target.getBoundingClientRect();
          setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            content: (
              <div className="space-y-1 max-w-[220px]">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-white border-b border-slate-700 pb-0.5">
                  <span className="text-cyan-400">#{s.id} · {s.type}</span>
                  <span className={isCorrelated ? 'text-emerald-400' : 'text-amber-400'}>
                    {isCorrelated ? 'Correlated' : 'No ADS-B'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium">{s.location_text}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {s.lat.toFixed(3)}°N, {s.lon.toFixed(3)}°W
                </div>
                <div className="text-[10px] text-slate-400">
                  Time: {new Date(s.sighting_time).toLocaleString()}
                </div>
              </div>
            ),
          });
        })
        .on('mouseleave', () => setTooltip(null));

      pGroup
        .append('circle')
        .attr('cx', sX)
        .attr('cy', sY)
        .attr('r', isCorrelated ? 3.5 : 4.5)
        .attr('fill', isCorrelated ? '#10b981' : '#06b6d4')
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1.5)
        .attr('opacity', isSectorActive ? 0.95 : 0.25);
    });

    // Geographic axes (Lat & Lon)
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
      .tickFormat((d) => `${Math.abs(Number(d)).toFixed(2)}°W`);
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${Number(d).toFixed(2)}°N`);

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisGroup.select('.domain').attr('stroke', '#475569');
    xAxisGroup
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'ui-monospace, monospace');

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').attr('stroke', '#475569');
    yAxisGroup
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'ui-monospace, monospace');
  }, [processedSightings, sectorStats, activeTab, containerWidth, activeFilter.sector]);

  // -------------------------------------------------------------
  // D3 RENDER 3: MORPHOLOGY / SHAPE VS TIME MATRIX HEATMAP
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'morphology' || !morphologySvgRef.current) return;

    const svg = d3.select(morphologySvgRef.current);
    svg.selectAll('*').remove();

    const width = Math.max(containerWidth, 540);
    const height = 290;
    const margin = { top: 25, right: 30, bottom: 40, left: 95 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Time block buckets (6 blocks of 4 hours)
    const timeBlocks = [
      { label: '00-04h Night', hours: [0, 1, 2, 3] },
      { label: '04-08h Dawn', hours: [4, 5, 6, 7] },
      { label: '08-12h Morning', hours: [8, 9, 10, 11] },
      { label: '12-16h Afternoon', hours: [12, 13, 14, 15] },
      { label: '16-20h Dusk', hours: [16, 17, 18, 19] },
      { label: '20-24h Nocturnal', hours: [20, 21, 22, 23] },
    ];

    // Unique shapes present in data
    const shapes = Array.from(new Set(processedSightings.map((s) => s.type)));
    if (shapes.length === 0) return;

    // Cross-tabulate counts
    const matrixData: { shape: SightingType; blockIndex: number; count: number; items: typeof processedSightings }[] = [];

    shapes.forEach((shape) => {
      timeBlocks.forEach((block, bIdx) => {
        const matches = processedSightings.filter(
          (s) => s.type === shape && block.hours.includes(s.analysisHour)
        );
        matrixData.push({
          shape,
          blockIndex: bIdx,
          count: matches.length,
          items: matches,
        });
      });
    });

    const maxCount = Math.max(1, d3.max(matrixData, (d) => d.count) || 1);

    const xScale = d3
      .scaleBand<number>()
      .domain(d3.range(timeBlocks.length))
      .range([0, innerWidth])
      .padding(0.12);

    const yScale = d3
      .scaleBand<string>()
      .domain(shapes)
      .range([0, innerHeight])
      .padding(0.14);

    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, maxCount]);

    // Render cells
    matrixData.forEach((cell) => {
      const cellX = xScale(cell.blockIndex) || 0;
      const cellY = yScale(cell.shape) || 0;
      const cellW = xScale.bandwidth();
      const cellH = yScale.bandwidth();

      const cellG = g
        .append('g')
        .attr('class', 'cursor-pointer')
        .on('mouseenter', (event) => {
          const target = event.currentTarget as Element | null;
          if (!target) return;
          const rect = target.getBoundingClientRect();
          setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            content: (
              <div className="space-y-1 min-w-[170px]">
                <div className="flex items-center justify-between font-mono text-xs font-bold text-white border-b border-slate-700 pb-1">
                  <span>{cell.shape}</span>
                  <span className="text-cyan-400">{timeBlocks[cell.blockIndex].label}</span>
                </div>
                <div className="text-xs flex justify-between">
                  <span className="text-slate-400">Sightings in Window:</span>
                  <span className="font-mono font-bold text-cyan-300">{cell.count}</span>
                </div>
                {cell.items.length > 0 && (
                  <div className="text-[10px] text-slate-400">
                    Sectors:{' '}
                    {Array.from(new Set(cell.items.map((i) => i.sector.name.split('/')[0]))).join(
                      ', '
                    )}
                  </div>
                )}
              </div>
            ),
          });
        })
        .on('mouseleave', () => setTooltip(null));

      cellG
        .append('rect')
        .attr('x', cellX)
        .attr('y', cellY)
        .attr('width', cellW)
        .attr('height', cellH)
        .attr('rx', 4)
        .attr(
          'fill',
          cell.count > 0 ? (cell.count === maxCount ? '#06b6d4' : colorScale(cell.count)) : '#0f172a'
        )
        .attr('stroke', cell.count > 0 ? '#38bdf8' : '#1e293b')
        .attr('stroke-width', cell.count > 0 ? 1 : 0.5)
        .attr('opacity', cell.count > 0 ? 0.95 : 0.4);

      if (cell.count > 0) {
        cellG
          .append('text')
          .attr('x', cellX + cellW / 2)
          .attr('y', cellY + cellH / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', '11px')
          .attr('font-family', 'ui-monospace, monospace')
          .attr('font-weight', 'bold')
          .text(cell.count);
      }
    });

    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((idx) => timeBlocks[Number(idx)].label);
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisGroup.select('.domain').attr('stroke', '#475569');
    xAxisGroup
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9.5px')
      .attr('font-family', 'ui-monospace, monospace');

    // Y Axis
    const yAxis = d3.axisLeft(yScale);
    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').attr('stroke', '#475569');
    yAxisGroup
      .selectAll('text')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-weight', '500');
  }, [processedSightings, activeTab, containerWidth]);

  const hasFilterActive = activeFilter.hour !== null || activeFilter.sector !== null;

  return (
    <div
      ref={containerRef}
      className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl"
    >
      {/* Header bar with tabs & time mode */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                D3 Historical Telemetry & Spatial Cluster Engine
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/80 text-cyan-300 font-semibold uppercase">
                Interactive D3.js
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Diurnal solar clock cycles, spatial sector clustering, and morphology cross-analysis.
            </p>
          </div>
        </div>

        {/* View mode tabs & time toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
            <button
              onClick={() => setActiveTab('diurnal')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'diurnal'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>24h Diurnal</span>
            </button>
            <button
              onClick={() => setActiveTab('geo')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'geo'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Geo Clusters</span>
            </button>
            <button
              onClick={() => setActiveTab('morphology')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'morphology'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Morphology Heatmap</span>
            </button>
          </div>

          {/* Time Zone Toggle (Local Omaha CST vs Zulu UTC) */}
          {activeTab === 'diurnal' && (
            <button
              onClick={() => setUseLocalTime(!useLocalTime)}
              className="px-2.5 py-1.5 text-[11px] font-mono bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
              title="Toggle between Omaha Local (CST/CDT) and Zulu (UTC) timing"
            >
              <span className="text-cyan-400 font-bold">TZ:</span>
              <span>{useLocalTime ? 'Local (CST)' : 'UTC (Zulu)'}</span>
            </button>
          )}

          {/* Active Filter Clear Button */}
          {hasFilterActive && (
            <button
              onClick={() => onFilterChange({ hour: null, sector: null })}
              className="px-2.5 py-1.5 text-xs font-mono bg-amber-950/80 border border-amber-700/80 text-amber-300 hover:bg-amber-900 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset D3 Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Insight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-800 bg-slate-950/50 divide-x divide-slate-800 text-xs font-mono">
        <div className="p-3 pl-5">
          <div className="text-[10px] text-slate-500 uppercase">Peak Window</div>
          <div className="font-bold text-amber-400 text-sm flex items-center gap-1 mt-0.5">
            <Flame className="w-3.5 h-3.5" />
            <span>
              {String(diurnalStats.peakHour).padStart(2, '0')}:00 -{' '}
              {String((diurnalStats.peakHour + 1) % 24).padStart(2, '0')}:00
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {diurnalStats.maxHourCount} sightings ({Math.round((diurnalStats.maxHourCount / Math.max(1, diurnalStats.total)) * 100)}%)
          </div>
        </div>

        <div className="p-3 pl-4">
          <div className="text-[10px] text-slate-500 uppercase">Nocturnal Ratio</div>
          <div className="font-bold text-cyan-400 text-sm flex items-center gap-1 mt-0.5">
            <Moon className="w-3.5 h-3.5" />
            <span>
              {Math.round(((diurnalStats.nocturnalCount + diurnalStats.twilightCount) / Math.max(1, diurnalStats.total)) * 100)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {diurnalStats.nocturnalCount} night · {diurnalStats.twilightCount} twilight
          </div>
        </div>

        <div className="p-3 pl-4">
          <div className="text-[10px] text-slate-500 uppercase">Top Cluster Sector</div>
          <div className="font-bold text-white text-xs truncate mt-0.5" title={sectorStats[0]?.sector.name}>
            {sectorStats[0]?.sector.name.split('/')[0].trim() || 'N/A'}
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">
            {sectorStats[0]?.count || 0} reports ({sectorStats[0]?.unmatched || 0} unmatched)
          </div>
        </div>

        <div className="p-3 pl-4">
          <div className="text-[10px] text-slate-500 uppercase">Active D3 Slice</div>
          <div className="font-bold text-slate-200 text-xs mt-0.5 truncate">
            {activeFilter.hour !== null
              ? `Hour: ${String(activeFilter.hour).padStart(2, '0')}:00`
              : activeFilter.sector
              ? `Sector: ${OMAHA_SECTORS.find((s) => s.id === activeFilter.sector)?.name.split('/')[0]}`
              : 'All 24h & Sectors'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {hasFilterActive ? 'Filter applied below' : 'Click bar/node to slice'}
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="p-4 sm:p-5 relative bg-gradient-to-b from-slate-900/60 to-slate-950/80">
        {/* Render Tab 1: Diurnal */}
        {activeTab === 'diurnal' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2.5 rounded-sm bg-cyan-400 inline-block shadow-sm shadow-cyan-500/50" />
                  <span className="text-slate-300">Unmatched / UAP (No ADS-B)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span className="text-slate-300">ADS-B Correlated Flights</span>
                </span>
                <span className="hidden sm:flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-0.5 bg-sky-400 inline-block" />
                  <span>Diurnal Trend Curve</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Shaded backdrop: Night / Twilight / Day phases
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                ref={diurnalSvgRef}
                className="w-full h-auto select-none font-sans"
                style={{ minHeight: '260px' }}
              />
            </div>
          </div>
        )}

        {/* Render Tab 2: Geo Clusters */}
        {activeTab === 'geo' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  <span className="text-slate-300">Station MUFON-OMA1 Radar Center</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border border-dashed border-cyan-400/60 inline-block" />
                  <span className="text-slate-300">Sector Centroid Density</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Bubble radius scales with report density
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                ref={geoSvgRef}
                className="w-full h-auto select-none font-sans"
                style={{ minHeight: '320px' }}
              />
            </div>

            {/* Quick sector selector pills */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase text-slate-500">
                Sectors:
              </span>
              {sectorStats.map((st) => (
                <button
                  key={st.sector.id}
                  onClick={() => {
                    if (activeFilter.sector === st.sector.id) {
                      onFilterChange({ ...activeFilter, sector: null });
                    } else {
                      onFilterChange({ ...activeFilter, sector: st.sector.id });
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
                    activeFilter.sector === st.sector.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: st.sector.color }}
                  />
                  <span>{st.sector.name.split('/')[0]}</span>
                  <span className="opacity-60 text-[10px]">({st.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render Tab 3: Morphology Heatmap */}
        {activeTab === 'morphology' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono text-slate-400">
              <span className="text-slate-300">
                Cross-tabulation: Silhouette Morphology vs 4-Hour Time Windows
              </span>
              <span className="text-[11px] text-slate-500">
                Darker cyan = higher frequency clustering
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                ref={morphologySvgRef}
                className="w-full h-auto select-none font-sans"
                style={{ minHeight: '270px' }}
              />
            </div>
          </div>
        )}

        {/* Floating Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-950/95 border border-cyan-500/50 shadow-2xl rounded-lg p-3 text-slate-200 backdrop-blur-md transition-all"
            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};
