import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { BusinessItem } from '../types';
import { 
  MapPin, 
  Navigation, 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  Mail, 
  Phone, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  Layers,
  Crosshair,
  Maximize2,
  Compass,
  RotateCcw,
  Sparkles,
  Globe2,
  CheckCircle2,
  Star
} from 'lucide-react';

interface InteractiveMapProps {
  businesses: BusinessItem[];
  center: { lat: number; lng: number };
  selectedBusinessId: string | null;
  hoveredBusinessId?: string | null;
  selectedBatchIds?: Set<string>;
  onSelectBusiness: (business: BusinessItem) => void;
  onHoverBusiness?: (businessId: string | null) => void;
  onCrawlBusiness: (business: BusinessItem) => void;
  isCrawlingAny: boolean;
  currentCountry?: string;
  searchedZipcodes?: string[];
  isFavorite?: (businessId: string) => boolean;
  onToggleFavorite?: (business: BusinessItem) => void;
}

// Google Maps Auto-Center Controller component inside APIProvider
const GoogleMapAutoCenterController: React.FC<{
  businesses: BusinessItem[];
  center: { lat: number; lng: number };
  autoCenterTrigger: number;
  autoCenterEnabled: boolean;
  selectedBusiness?: BusinessItem | null;
}> = ({ businesses, center, autoCenterTrigger, autoCenterEnabled, selectedBusiness }) => {
  const map = useMap('main-google-map');
  const prevSelectedId = useRef<string | null>(null);

  // Pan to selected business smoothly and zoom into it prominently when clicked/selected
  useEffect(() => {
    if (!map || !selectedBusiness) return;
    prevSelectedId.current = selectedBusiness.id;

    if (
      typeof selectedBusiness.latitude === 'number' &&
      typeof selectedBusiness.longitude === 'number' &&
      !isNaN(selectedBusiness.latitude) &&
      !isNaN(selectedBusiness.longitude)
    ) {
      map.panTo({ lat: selectedBusiness.latitude, lng: selectedBusiness.longitude });
      map.setZoom(17);
    }
  }, [map, selectedBusiness?.id, selectedBusiness?.latitude, selectedBusiness?.longitude]);

  useEffect(() => {
    if (!map || !autoCenterEnabled) return;
    // CRITICAL: When a specific business is focused / favorited, keep the map centered and zoomed on that business
    if (selectedBusiness) return;

    if (businesses.length > 0 && typeof window !== 'undefined' && (window as any).google?.maps) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      let hasValidCoord = false;

      businesses.forEach(b => {
        if (typeof b.latitude === 'number' && typeof b.longitude === 'number' && !isNaN(b.latitude) && !isNaN(b.longitude)) {
          bounds.extend({ lat: b.latitude, lng: b.longitude });
          hasValidCoord = true;
        }
      });

      if (hasValidCoord) {
        map.fitBounds(bounds, { top: 60, bottom: 80, left: 50, right: 50 });
        return;
      }
    }

    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      map.panTo(center);
      map.setZoom(13);
    }
  }, [map, businesses, center.lat, center.lng, autoCenterTrigger, autoCenterEnabled, selectedBusiness]);

  return null;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  businesses,
  center,
  selectedBusinessId,
  hoveredBusinessId = null,
  selectedBatchIds,
  onSelectBusiness,
  onHoverBusiness,
  onCrawlBusiness,
  isCrawlingAny,
  currentCountry = 'Worldwide',
  searchedZipcodes = [],
  isFavorite,
  onToggleFavorite
}) => {
  const apiKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const [autoCenterTrigger, setAutoCenterTrigger] = useState<number>(0);
  const [autoCenterEnabled, setAutoCenterEnabled] = useState<boolean>(true);
  const [autoCenterFeedback, setAutoCenterFeedback] = useState<string | null>(null);

  // Compute bounding box & geographic metadata of overall search area
  const areaStats = useMemo(() => {
    const validLats = businesses.map(b => b.latitude).filter(n => typeof n === 'number' && !isNaN(n));
    const validLngs = businesses.map(b => b.longitude).filter(n => typeof n === 'number' && !isNaN(n));

    if (validLats.length === 0 || validLngs.length === 0) {
      return {
        centroidLat: center.lat || 51.5074,
        centroidLng: center.lng || -0.1278,
        latSpan: 0.05,
        lngSpan: 0.05,
        approxRadiusKm: 5,
        primaryCity: currentCountry && currentCountry !== 'Worldwide / All Countries' ? currentCountry : 'Worldwide Radar',
      };
    }

    const minLat = Math.min(...validLats);
    const maxLat = Math.max(...validLats);
    const minLng = Math.min(...validLngs);
    const maxLng = Math.max(...validLngs);

    const centroidLat = (minLat + maxLat) / 2;
    const centroidLng = (minLng + maxLng) / 2;
    const latSpan = Math.max(maxLat - minLat, 0.008);
    const lngSpan = Math.max(maxLng - minLng, 0.008);

    // Approximate km span using latitude degree conversion (~111 km per lat degree)
    const latKm = latSpan * 111;
    const lngKm = lngSpan * 111 * Math.cos((centroidLat * Math.PI) / 180);
    const approxRadiusKm = Math.max(Math.round(Math.sqrt(latKm * latKm + lngKm * lngKm) / 2), 2);

    // Find the most frequent or first non-empty city from businesses
    const discoveredCity = businesses.find(b => b.city && b.city.trim() !== '')?.city || 'Target Area';
    const primaryCity = discoveredCity;

    return {
      centroidLat,
      centroidLng,
      latSpan,
      lngSpan,
      approxRadiusKm,
      primaryCity,
    };
  }, [businesses, center]);

  // Trigger auto-centering on overall area
  const handleAutoCenter = useCallback((manual = false) => {
    setAutoCenterTrigger(prev => prev + 1);
    const cityName = areaStats.primaryCity;
    const codes = searchedZipcodes.length > 0 ? ` (${searchedZipcodes.slice(0, 3).join(', ')})` : '';
    setAutoCenterFeedback(`Auto-centered on ${cityName}${codes} • ${businesses.length} locations framed`);
    
    // Clear feedback chip after 3.5 seconds
    const timer = setTimeout(() => {
      setAutoCenterFeedback(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [areaStats.primaryCity, searchedZipcodes, businesses.length]);

  // Auto-center automatically when new businesses or location is loaded (if not focusing a specific business)
  useEffect(() => {
    if (autoCenterEnabled && businesses.length > 0 && !selectedBusinessId) {
      handleAutoCenter(false);
    }
  }, [businesses, center.lat, center.lng, autoCenterEnabled, selectedBusinessId]);

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId) || null;

  // Informative banner when focusing and centering a specific business (such as a favorited business)
  useEffect(() => {
    if (selectedBusiness) {
      setAutoCenterFeedback(`Centered & zoomed on: ${selectedBusiness.name}`);
      const timer = setTimeout(() => {
        setAutoCenterFeedback(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [selectedBusiness?.id]);

  // Pin styling helper
  const getPinColor = (status: BusinessItem['enrichmentStatus'], hasEmail: boolean) => {
    if (status === 'crawling') return '#f59e0b'; // Amber
    if (status === 'enriched' && hasEmail) return '#10b981'; // Emerald
    if (status === 'enriched' && !hasEmail) return '#6366f1'; // Indigo
    return '#3b82f6'; // Blue
  };

  return (
    <div id="interactive-map-container" className="relative w-full h-[540px] rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-slate-950 flex flex-col group">
      {/* Map Top Floating Controls Bar */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2 pointer-events-none flex-wrap">
        {/* Left: Overall Area & Metrics Pill */}
        <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-700/60 shadow-lg text-xs font-semibold text-white flex items-center gap-2 pointer-events-auto">
          <Navigation className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-white font-bold">{areaStats.primaryCity}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 font-normal">
            {businesses.length > 0 ? `~${areaStats.approxRadiusKm} km radar radius` : 'Ready to search'}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {businesses.length > 0 
              ? `${businesses.filter(b => b.enrichmentStatus === 'enriched' && b.executiveDetails?.personalEmail).length} Direct Verified` 
              : '0 Leads • Clean Workspace'}
          </span>
        </div>

        {/* Right: Quick Auto-Center Button & Mode Selector */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Auto-Center on Overall Area Button */}
          <button
            type="button"
            onClick={() => handleAutoCenter(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Automatically center and fit camera to the entire target area"
          >
            <Crosshair className="w-3.5 h-3.5 text-slate-950" />
            <span>Center Area</span>
          </button>

          {/* Auto-Center Toggle */}
          <button
            type="button"
            onClick={() => setAutoCenterEnabled(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer backdrop-blur-md shadow-xs flex items-center gap-1.5 ${
              autoCenterEnabled 
                ? 'bg-slate-900/90 text-emerald-300 border-emerald-500/40' 
                : 'bg-slate-900/70 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
            title={autoCenterEnabled ? "Auto-center is active for all new searches" : "Auto-center is paused"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoCenterEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
            <span>Auto-Center: {autoCenterEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Auto-Center Trigger Notification Banner */}
      {autoCenterFeedback && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md border border-amber-400/50 text-white text-xs font-semibold px-3.5 py-1 rounded-full shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{autoCenterFeedback}</span>
          </div>
        </div>
      )}

      {/* Embedded Map Render */}
      {apiKey ? (
        <div className="w-full h-full">
          <APIProvider apiKey={apiKey}>
            <Map
              id="main-google-map"
              defaultCenter={{ lat: areaStats.centroidLat, lng: areaStats.centroidLng }}
              defaultZoom={13}
              mapId="DEMO_MAP_ID"
              style={{ width: '100%', height: '100%' }}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              <GoogleMapAutoCenterController
                businesses={businesses}
                center={{ lat: areaStats.centroidLat, lng: areaStats.centroidLng }}
                autoCenterTrigger={autoCenterTrigger}
                autoCenterEnabled={autoCenterEnabled}
                selectedBusiness={selectedBusiness}
              />

              {businesses.map((biz) => {
                const hasPersonalEmail = Boolean(biz.executiveDetails?.personalEmail);
                const isChecked = Boolean(selectedBatchIds?.has(biz.id));
                const isHovered = biz.id === hoveredBusinessId;
                const isSelected = biz.id === selectedBusinessId;
                
                // When hovering another company, previous selected isn't highlighted unless checked with top-left checkbox
                const isHighlighted = isHovered || isChecked || (!hoveredBusinessId && isSelected);
                const basePinColor = getPinColor(biz.enrichmentStatus, hasPersonalEmail);
                const color = isHighlighted ? '#FACC15' : basePinColor;

                return (
                  <AdvancedMarker
                    key={biz.id}
                    position={{ lat: biz.latitude, lng: biz.longitude }}
                    onClick={() => onSelectBusiness(biz)}
                    title={biz.name}
                    zIndex={isHighlighted ? 999 : 10}
                  >
                    <div 
                      onMouseEnter={() => onHoverBusiness?.(biz.id)}
                      onMouseLeave={() => onHoverBusiness?.(null)}
                      className={`relative cursor-pointer select-none ${isHighlighted ? 'z-50' : 'z-10 hover:z-40'}`}
                    >
                      <div 
                        style={{ transformOrigin: 'bottom center' }}
                        className={`relative flex flex-col items-center ${
                          isHighlighted 
                            ? 'animate-pin-highlight' 
                            : 'transition-transform duration-200 hover:scale-110 hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Highlight Spotlight Beacon Halo */}
                        {isHighlighted && (
                          <>
                            <div className="absolute -inset-2 rounded-full bg-amber-400/30 animate-pin-halo pointer-events-none" />
                            <div className="absolute -inset-0.5 rounded-full ring-2 ring-amber-400/80 shadow-md shadow-amber-500/40 pointer-events-none" />
                          </>
                        )}

                        {/* Pin Icon Bubble */}
                        <div
                          style={{ backgroundColor: color }}
                          className={`rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-200 ${
                            isHighlighted 
                              ? 'w-8 h-8 text-slate-950 font-bold border-amber-900/60 ring-2 ring-amber-400 shadow-amber-500/50' 
                              : 'w-7 h-7 text-white border-white group-hover:shadow-md'
                          }`}
                        >
                          {biz.enrichmentStatus === 'enriched' && hasPersonalEmail ? (
                            <UserCheck className={isHighlighted ? 'w-4 h-4 text-slate-950 stroke-[2.2]' : 'w-3.5 h-3.5'} />
                          ) : (
                            <Building2 className={isHighlighted ? 'w-4 h-4 text-slate-950 stroke-[2.2]' : 'w-3.5 h-3.5'} />
                          )}
                        </div>

                        {/* Pin Arrow */}
                        <div
                          style={{ borderTopColor: color }}
                          className={`w-0 h-0 border-x-transparent -mt-0.5 transition-all duration-200 ${
                            isHighlighted ? 'border-x-[5px] border-t-[7px]' : 'border-x-4 border-t-[6px]'
                          }`}
                        ></div>

                        {/* Tooltip on Highlight/Hover */}
                        {isHighlighted && (
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md text-white text-xs py-1.5 px-3 rounded-xl whitespace-nowrap shadow-2xl border border-yellow-400 z-50 flex items-center gap-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                            <span className="font-bold">{biz.name}</span>
                            {biz.executiveDetails?.personalEmail && (
                              <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                Direct Inbox
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </APIProvider>
        </div>
      ) : (
        /* High-Definition Interactive Vector Radar Map (Auto-centers dynamically) */
        <InteractiveVectorMap
          businesses={businesses}
          center={{ lat: areaStats.centroidLat, lng: areaStats.centroidLng }}
          selectedBusinessId={selectedBusinessId}
          hoveredBusinessId={hoveredBusinessId}
          selectedBatchIds={selectedBatchIds}
          onSelectBusiness={onSelectBusiness}
          onHoverBusiness={onHoverBusiness}
          getPinColor={getPinColor}
          autoCenterTrigger={autoCenterTrigger}
          onAutoCenterArea={() => handleAutoCenter(true)}
          areaStats={areaStats}
        />
      )}

      {/* Floating Selected Business Card Overlay */}
      {selectedBusiness && (
        <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:left-4 sm:max-w-md z-20 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                  {selectedBusiness.category}
                </span>
                {selectedBusiness.country && (
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {selectedBusiness.country}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{selectedBusiness.name}</h4>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {selectedBusiness.address}, {selectedBusiness.city} {selectedBusiness.zipcode}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(selectedBusiness)}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    isFavorite?.(selectedBusiness.id)
                      ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                  title={isFavorite?.(selectedBusiness.id) ? 'Favorited in Favorites section (Click to remove)' : 'Add to Favorites'}
                >
                  <Star className={`w-4 h-4 ${isFavorite?.(selectedBusiness.id) ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAutoCenter(true)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                title="Reset camera & center overall area"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <a
                href={selectedBusiness.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(selectedBusiness.name + ' ' + selectedBusiness.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                title="Open in Google Maps"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Executive Discovery State */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            {selectedBusiness.enrichmentStatus === 'enriched' && selectedBusiness.executiveDetails ? (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 truncate">
                  <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate">{selectedBusiness.executiveDetails.executiveName || 'Executive Disclosed'}</span>
                  <span className="text-slate-500 font-normal truncate">({selectedBusiness.executiveDetails.executiveTitle || 'Owner'})</span>
                </div>
                {selectedBusiness.executiveDetails.personalEmail ? (
                  <div className="flex items-center gap-1 text-xs text-slate-900 mt-1 font-mono">
                    <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate font-bold text-emerald-700">{selectedBusiness.executiveDetails.personalEmail}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">Generic aliases excluded. No personal mailbox disclosed.</p>
                )}
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-xs text-slate-400 font-medium">Executive contact unsearched</p>
              </div>
            )}

            {selectedBusiness.enrichmentStatus !== 'enriched' && (
              <button
                type="button"
                onClick={() => onCrawlBusiness(selectedBusiness)}
                disabled={isCrawlingAny || selectedBusiness.enrichmentStatus === 'crawling'}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {selectedBusiness.enrichmentStatus === 'crawling' ? (
                  <>
                    <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                    <span>Crawling...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Deep Crawl</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// High-fidelity vector radar canvas map with smart auto-centering on overall target areas
const InteractiveVectorMap: React.FC<{
  businesses: BusinessItem[];
  center: { lat: number; lng: number };
  selectedBusinessId: string | null;
  hoveredBusinessId?: string | null;
  selectedBatchIds?: Set<string>;
  onSelectBusiness: (biz: BusinessItem) => void;
  onHoverBusiness?: (businessId: string | null) => void;
  getPinColor: (status: BusinessItem['enrichmentStatus'], hasEmail: boolean) => string;
  autoCenterTrigger: number;
  onAutoCenterArea: () => void;
  areaStats: {
    centroidLat: number;
    centroidLng: number;
    latSpan: number;
    lngSpan: number;
    approxRadiusKm: number;
    primaryCity: string;
  };
}> = ({ 
  businesses, 
  center, 
  selectedBusinessId, 
  hoveredBusinessId = null,
  selectedBatchIds,
  onSelectBusiness, 
  onHoverBusiness,
  getPinColor, 
  autoCenterTrigger, 
  onAutoCenterArea,
  areaStats 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isCenteringAnimation, setIsCenteringAnimation] = useState(false);

  // Auto-center camera back to bounds centroid whenever autoCenterTrigger fires or businesses load
  useEffect(() => {
    setIsCenteringAnimation(true);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    const timeout = setTimeout(() => setIsCenteringAnimation(false), 500);
    return () => clearTimeout(timeout);
  }, [autoCenterTrigger, businesses.length, areaStats.centroidLat, areaStats.centroidLng]);

  // Calculate normalized geographic bounds
  const validLats = businesses.map(b => b.latitude).filter(n => typeof n === 'number' && !isNaN(n));
  const validLngs = businesses.map(b => b.longitude).filter(n => typeof n === 'number' && !isNaN(n));

  const minLat = validLats.length ? Math.min(...validLats) : center.lat - 0.03;
  const maxLat = validLats.length ? Math.max(...validLats) : center.lat + 0.03;
  const minLng = validLngs.length ? Math.min(...validLngs) : center.lng - 0.03;
  const maxLng = validLngs.length ? Math.max(...validLngs) : center.lng + 0.03;

  const latSpan = Math.max(maxLat - minLat, 0.008);
  const lngSpan = Math.max(maxLng - minLng, 0.008);

  // Smoothly center and zoom on selected business when selected
  useEffect(() => {
    if (!selectedBusinessId) return;
    const target = businesses.find(b => b.id === selectedBusinessId);
    if (!target) return;
    if (typeof target.latitude !== 'number' || typeof target.longitude !== 'number' || isNaN(target.latitude) || isNaN(target.longitude)) return;

    const normX = (validLngs.length > 1 && maxLng > minLng)
      ? 18 + ((target.longitude - minLng) / (maxLng - minLng)) * 64
      : 50;
    const normY = (validLats.length > 1 && maxLat > minLat)
      ? 82 - ((target.latitude - minLat) / (maxLat - minLat)) * 64
      : 50;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const targetPxX = (normX / 100) * rect.width;
      const targetPxY = (normY / 100) * rect.height;
      const centerPxX = rect.width / 2;
      const centerPxY = rect.height / 2;

      const targetZoom = 1.85;
      setZoom(targetZoom);
      setOffset({
        x: centerPxX - targetPxX * targetZoom,
        y: centerPxY - targetPxY * targetZoom,
      });
      setIsCenteringAnimation(true);
      const timer = setTimeout(() => setIsCenteringAnimation(false), 450);
      return () => clearTimeout(timer);
    }
  }, [selectedBusinessId, minLat, minLng, latSpan, lngSpan, businesses, validLats.length, validLngs.length, maxLat, maxLng]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 select-none"
    >
      {/* Grid Pattern & Radar Sweeps */}
      <div
        className={`absolute inset-0 opacity-30 pointer-events-none transition-transform duration-300 ${isCenteringAnimation ? 'scale-105' : ''}`}
        style={{
          backgroundImage: `radial-gradient(#6366f1 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
        }}
      />

      {/* Target Area Bounding Frame & Concentric Radar Rings */}
      <div 
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-300 ${isCenteringAnimation ? 'animate-pulse' : ''}`}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
        }}
      >
        <div className="w-[440px] h-[440px] rounded-full border border-indigo-500/20 relative flex items-center justify-center">
          <div className="absolute w-[290px] h-[290px] rounded-full border border-indigo-400/20 flex items-center justify-center">
            <div className="w-[140px] h-[140px] rounded-full border border-indigo-300/25 bg-indigo-500/5"></div>
          </div>
          {/* Target Reticle Lines */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
          <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-indigo-500/30 to-transparent"></div>
        </div>
      </div>

      {/* Map Camera / Navigation Overlay Controls */}
      <div className="absolute right-3.5 bottom-3.5 z-10 flex flex-col gap-1 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-1 shadow-xl backdrop-blur-md text-white">
        <button
          type="button"
          onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(z => Math.max(z - 0.25, 0.6))}
          className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onAutoCenterArea}
          className="p-1.5 hover:bg-amber-400 active:bg-amber-500 rounded-xl text-amber-400 hover:text-slate-950 transition-all cursor-pointer group/btn"
          title="Auto-Center Target Area"
        >
          <Crosshair className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
        </button>
      </div>

      {/* Pins Stage (Geographic Normalization relative to Target Area bounds) */}
      <div
        className="absolute inset-0 w-full h-full transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {businesses.map((biz) => {
          // Normalize lat/lng to container percentage space with 18% safety padding
          const normX = (validLngs.length > 1 && maxLng > minLng)
            ? 18 + ((biz.longitude - minLng) / (maxLng - minLng)) * 64
            : 50;
          const normY = (validLats.length > 1 && maxLat > minLat)
            ? 82 - ((biz.latitude - minLat) / (maxLat - minLat)) * 64
            : 50;

          const isChecked = Boolean(selectedBatchIds?.has(biz.id));
          const isHovered = biz.id === hoveredBusinessId;
          const isSelected = biz.id === selectedBusinessId;
          
          // When hovering another company, previous selected isn't highlighted unless checked with top-left checkbox
          const isHighlighted = isHovered || isChecked || (!hoveredBusinessId && isSelected);
          const hasPersonalEmail = Boolean(biz.executiveDetails?.personalEmail);
          const baseColor = getPinColor(biz.enrichmentStatus, hasPersonalEmail);
          const color = isHighlighted ? '#FACC15' : baseColor;

          return (
            <div
              key={biz.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBusiness(biz);
              }}
              onMouseEnter={() => onHoverBusiness?.(biz.id)}
              onMouseLeave={() => onHoverBusiness?.(null)}
              style={{
                left: `${normX}%`,
                top: `${normY}%`,
              }}
              className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer group select-none ${
                isHighlighted ? 'z-50' : 'z-10 hover:z-40'
              }`}
            >
              <div 
                style={{ transformOrigin: 'bottom center' }}
                className={`relative flex flex-col items-center ${
                  isHighlighted 
                    ? 'animate-pin-highlight' 
                    : 'transition-transform duration-200 hover:scale-110 hover:-translate-y-0.5'
                }`}
              >
                {/* Highlight Spotlight Beacon Halo */}
                {isHighlighted && (
                  <>
                    <div className="absolute -inset-2 rounded-full bg-amber-400/30 animate-pin-halo pointer-events-none" />
                    <div className="absolute -inset-0.5 rounded-full ring-2 ring-amber-400/80 shadow-md shadow-amber-500/40 pointer-events-none" />
                  </>
                )}

                {/* Pin Icon Bubble */}
                <div
                  style={{ backgroundColor: color }}
                  className={`rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-200 ${
                    isHighlighted 
                      ? 'w-8 h-8 text-slate-950 font-bold border-amber-900/60 ring-2 ring-amber-400 shadow-amber-500/50' 
                      : 'w-7 h-7 text-white border-white group-hover:shadow-md'
                  }`}
                >
                  {biz.enrichmentStatus === 'enriched' && hasPersonalEmail ? (
                    <UserCheck className={isHighlighted ? 'w-4 h-4 text-slate-950 stroke-[2.2]' : 'w-3.5 h-3.5'} />
                  ) : (
                    <Building2 className={isHighlighted ? 'w-4 h-4 text-slate-950 stroke-[2.2]' : 'w-3.5 h-3.5'} />
                  )}
                </div>

                {/* Pin Arrow */}
                <div
                  style={{ borderTopColor: color }}
                  className={`w-0 h-0 border-x-transparent -mt-0.5 transition-all duration-200 ${
                    isHighlighted ? 'border-x-[5px] border-t-[7px]' : 'border-x-4 border-t-[6px]'
                  }`}
                ></div>

                {/* Hover / Highlight Mini Tooltip */}
                <div className={`pointer-events-none absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md text-white text-xs py-1.5 px-3 rounded-xl whitespace-nowrap shadow-2xl border transition-all z-50 flex items-center gap-1.5 ${
                  isHighlighted 
                    ? 'opacity-100 border-yellow-400 scale-105' 
                    : 'opacity-0 group-hover:opacity-100 border-slate-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isHighlighted ? 'bg-yellow-400 animate-pulse' : 'bg-indigo-400'}`}></span>
                  <span className="font-bold">{biz.name}</span>
                  {biz.executiveDetails?.personalEmail ? (
                    <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-0.5 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500/30">
                      <Mail className="w-2.5 h-2.5" />
                      {biz.executiveDetails.executiveName || 'Verified Mailbox'}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px] font-mono">{biz.zipcode}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
