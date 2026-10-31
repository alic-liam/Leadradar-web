import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Plus, 
  X, 
  Sparkles, 
  Building, 
  Compass, 
  Globe2, 
  ArrowRight,
  Loader2,
  CheckCircle2,
  Building2,
  Info,
  RotateCcw
} from 'lucide-react';
import { SearchQueryParams } from '../types';
import { 
  CityPostalInfo, 
  searchCitySuggestions, 
  resolveCityToPostalCodes, 
  isLikelyPostalCode 
} from '../utils/cityPostalLookup';

interface ZipcodeSearchFormProps {
  onSearch: (params: SearchQueryParams) => void;
  isLoading: boolean;
  initialZipcodes?: string[];
  initialCountry?: string;
  onStartFresh?: () => void;
  hasActiveResults?: boolean;
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  defaultPostal: string[];
}

export const COUNTRIES: CountryOption[] = [
  { code: 'GLOBAL', name: 'Worldwide / All Countries', flag: '🌐', defaultPostal: ['EC1A', '10115', '94105'] },
  { code: 'US', name: 'United States', flag: '🇺🇸', defaultPostal: ['94105', '94107'] },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', defaultPostal: ['EC1A', 'SW1A'] },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', defaultPostal: ['10115', '10117'] },
  { code: 'FR', name: 'France', flag: '🇫🇷', defaultPostal: ['75008', '75001'] },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', defaultPostal: ['M5V', 'M5H'] },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', defaultPostal: ['2000', '3000'] },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', defaultPostal: ['8001', '1201'] },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', defaultPostal: ['DIFC', '00000'] },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', defaultPostal: ['100-0001', '106-0032'] },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', defaultPostal: ['1012', '1082'] },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', defaultPostal: ['20121', '00187'] },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', defaultPostal: ['28001', '08007'] },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', defaultPostal: ['018981', '048624'] },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', defaultPostal: ['D02', 'D04'] },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', defaultPostal: ['111 20', '114 34'] },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', defaultPostal: ['1010', '5020'] },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', defaultPostal: ['1000', '2000'] },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', defaultPostal: ['1010', '6011'] },
  { code: 'IN', name: 'India', flag: '🇮🇳', defaultPostal: ['110001', '400001'] },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', defaultPostal: ['01310', '20040'] },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', defaultPostal: ['06600', '11000'] },
];

const PRESET_GLOBAL_LOCATIONS = [
  { label: '🇬🇧 London Law & Capital', country: 'United Kingdom', zipcodes: ['EC1A', 'SW1A'], category: 'Law Firms & Attorneys' },
  { label: '🇩🇪 Berlin Tech & Advisory', country: 'Germany', zipcodes: ['10115', '10117'], category: 'Commercial Real Estate' },
  { label: '🇫🇷 Paris Corporate & Luxury', country: 'France', zipcodes: ['75008', '75001'], category: 'Accounting & CPA Firms' },
  { label: '🇺🇸 San Francisco Tech Hub', country: 'United States', zipcodes: ['94105', '94107'], category: 'Law Firms & Attorneys' },
  { label: '🇺🇸 New York Finance & CPA', country: 'United States', zipcodes: ['10001', '10018'], category: 'Accounting & CPA Firms' },
  { label: '🇨🇦 Toronto Advisory & Tech', country: 'Canada', zipcodes: ['M5V', 'M5H'], category: 'Commercial Real Estate' },
  { label: '🇦🇺 Sydney Corporate Practice', country: 'Australia', zipcodes: ['2000', '3000'], category: 'Law Firms & Attorneys' },
  { label: '🇨🇭 Zurich Wealth & Private', country: 'Switzerland', zipcodes: ['8001'], category: 'Accounting & CPA Firms' },
  { label: '🇦🇪 Dubai DIFC Commercial', country: 'United Arab Emirates', zipcodes: ['DIFC'], category: 'Commercial Real Estate' },
  { label: '🇯🇵 Tokyo Enterprise & Legal', country: 'Japan', zipcodes: ['100-0001'], category: 'Law Firms & Attorneys' },
];

const POPULAR_CATEGORIES = [
  'All Businesses',
  'Law Firms & Attorneys',
  'Commercial Real Estate',
  'Accounting & CPA Firms',
  'HVAC & Building Mechanical',
  'Roofing & Construction',
  'Medical & Dental Clinics',
  'Marketing & Tech Agencies',
  'Private Equity & Financial Advisory',
  'Architects & Engineering',
  'Consulting & Management',
  'Auto Dealerships & Repair',
];

const QUICK_CITY_CHIPS = [
  { city: 'Berlin', country: 'Germany' },
  { city: 'Munich', country: 'Germany' },
  { city: 'London', country: 'United Kingdom' },
  { city: 'Paris', country: 'France' },
  { city: 'Miami', country: 'United States' },
  { city: 'New York', country: 'United States' },
  { city: 'Zurich', country: 'Switzerland' },
];

export const ZipcodeSearchForm: React.FC<ZipcodeSearchFormProps> = ({ 
  onSearch, 
  isLoading,
  initialZipcodes,
  initialCountry,
  onStartFresh,
  hasActiveResults
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry || 'Worldwide / All Countries');
  const [zipcodes, setZipcodes] = useState<string[]>(initialZipcodes ?? []);
  const [currentZipInput, setCurrentZipInput] = useState<string>('');
  const [category, setCategory] = useState<string>('Law Firms & Attorneys');
  const [customKeyword, setCustomKeyword] = useState<string>('');
  const [limit, setLimit] = useState<number>(15);

  // Sync when initialZipcodes or initialCountry updates from active or restored search session
  useEffect(() => {
    if (initialZipcodes && initialZipcodes.length > 0) {
      setZipcodes(initialZipcodes);
    }
  }, [initialZipcodes]);

  useEffect(() => {
    if (initialCountry) {
      setSelectedCountry(initialCountry);
    }
  }, [initialCountry]);

  // Clear all entered search codes and reset to clean state
  const handleClearAll = () => {
    setZipcodes([]);
    setCurrentZipInput('');
    setCustomKeyword('');
    setCityFeedback(null);
    setShowSuggestions(false);
    onStartFresh?.();
  };

  // City Auto-Find State
  const [isResolvingCity, setIsResolvingCity] = useState<boolean>(false);
  const [cityFeedback, setCityFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [suggestions, setSuggestions] = useState<CityPostalInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Update suggestions as user types
  useEffect(() => {
    const raw = currentZipInput.trim();
    if (raw.length >= 2 && !isLikelyPostalCode(raw)) {
      const matches = searchCitySuggestions(raw, 5);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [currentZipInput]);

  // Close suggestions if user clicks outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountryChange = (countryName: string) => {
    setSelectedCountry(countryName);
    const matched = COUNTRIES.find(c => c.name === countryName);
    if (matched && matched.defaultPostal.length > 0) {
      setZipcodes(matched.defaultPostal);
    }
  };

  /**
   * Automatically resolves a city input into real postal codes and immediately brings user to that city
   */
  const handleAutoFindCityPostalCodes = async (cityName: string, replaceExisting = true, autoTriggerSearch = true) => {
    const trimmed = cityName.trim();
    if (!trimmed) return;

    setIsResolvingCity(true);
    setShowSuggestions(false);
    setCurrentZipInput('');
    setCityFeedback({ message: `Navigating to "${trimmed}" & detecting postal codes...`, type: 'info' });

    try {
      const result = await resolveCityToPostalCodes(trimmed, selectedCountry);

      if (result && result.postalCodes && result.postalCodes.length > 0) {
        // Replace existing postal codes so the app targets this specific city directly
        const targetCodes = replaceExisting ? result.postalCodes : Array.from(new Set([...zipcodes, ...result.postalCodes]));
        setZipcodes(targetCodes);

        // Auto-match country if country was generic or changed
        let targetCountry = selectedCountry;
        if (result.country) {
          const matchedCountry = COUNTRIES.find(c => c.name.toLowerCase() === result.country.toLowerCase());
          if (matchedCountry) {
            targetCountry = matchedCountry.name;
            setSelectedCountry(matchedCountry.name);
          }
        }

        setCityFeedback({
          message: `✨ Arrived at ${result.city}${result.country ? `, ${result.country}` : ''}! Auto-scanning ${result.postalCodes.length} postal codes: ${result.postalCodes.join(', ')}`,
          type: 'success'
        });

        // Automatically trigger search to bring user immediately to the city
        if (autoTriggerSearch) {
          onSearch({
            country: targetCountry,
            zipcodes: targetCodes,
            category: category === 'All Businesses' ? '' : category,
            keyword: customKeyword,
            limit,
          });
        }
      } else {
        // Fallback: add as custom district tag and run search
        const cleanTag = trimmed.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const fallbackCodes = replaceExisting ? [cleanTag] : Array.from(new Set([...zipcodes, cleanTag]));
        setZipcodes(fallbackCodes);
        setCityFeedback({
          message: `Navigating to district "${cleanTag}"...`,
          type: 'info'
        });

        if (autoTriggerSearch) {
          onSearch({
            country: selectedCountry,
            zipcodes: fallbackCodes,
            category: category === 'All Businesses' ? '' : category,
            keyword: customKeyword,
            limit,
          });
        }
      }
    } catch (err) {
      console.error('Error resolving city postal codes:', err);
      setCityFeedback({
        message: `Could not auto-resolve postal codes for "${trimmed}".`,
        type: 'error'
      });
    } finally {
      setIsResolvingCity(false);
      setTimeout(() => {
        setCityFeedback(null);
      }, 5000);
    }
  };

  const handleApplyCitySuggestion = (item: CityPostalInfo) => {
    // When user selects a city from autocomplete, immediately replace postal codes and navigate there
    setZipcodes(item.postalCodes);

    let targetCountry = selectedCountry;
    const matchedCountry = COUNTRIES.find(c => c.name.toLowerCase() === item.country.toLowerCase());
    if (matchedCountry) {
      targetCountry = matchedCountry.name;
      setSelectedCountry(matchedCountry.name);
    }

    setCityFeedback({
      message: `✨ Arrived at ${item.city}, ${item.country}! Auto-scanning postal codes: ${item.postalCodes.join(', ')}`,
      type: 'success'
    });

    setCurrentZipInput('');
    setShowSuggestions(false);

    // Immediately trigger search to navigate to the city on map & list
    onSearch({
      country: targetCountry,
      zipcodes: item.postalCodes,
      category: category === 'All Businesses' ? '' : category,
      keyword: customKeyword,
      limit,
    });

    setTimeout(() => {
      setCityFeedback(null);
    }, 5000);
  };

  const handleAddZipcode = () => {
    const raw = currentZipInput.trim();
    if (!raw) return;

    // Check if the input looks like a city name rather than a postal code
    if (!isLikelyPostalCode(raw) && raw.length >= 3 && !raw.includes(',')) {
      handleAutoFindCityPostalCodes(raw, false);
      return;
    }

    // Split by commas or spaces if user pasted multiple postal codes
    const parts = raw.split(/[,]+/).map(p => p.trim()).filter(p => p.length >= 2);
    const newZips = Array.from(new Set([...zipcodes, ...parts]));
    setZipcodes(newZips);
    setCurrentZipInput('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = currentZipInput.trim();
      if (raw && !isLikelyPostalCode(raw) && raw.length >= 3) {
        handleAutoFindCityPostalCodes(raw, true, true);
      } else {
        handleAddZipcode();
      }
    } else if (e.key === ',') {
      e.preventDefault();
      handleAddZipcode();
    }
  };

  const handleRemoveZipcode = (zipToRemove: string) => {
    setZipcodes(zipcodes.filter(z => z !== zipToRemove));
  };

  const handleApplyPreset = (preset: typeof PRESET_GLOBAL_LOCATIONS[0]) => {
    setSelectedCountry(preset.country);
    setZipcodes(preset.zipcodes);
    setCategory(preset.category);
    onSearch({
      country: preset.country,
      zipcodes: preset.zipcodes,
      category: preset.category,
      keyword: customKeyword,
      limit,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = currentZipInput.trim();

    // If user has text in the input that hasn't been submitted yet
    let activeZips = [...zipcodes];
    let targetCountry = selectedCountry;

    if (raw) {
      if (!isLikelyPostalCode(raw) && raw.length >= 3) {
        // Automatically resolve city postal codes before submitting and focus on that city
        setIsResolvingCity(true);
        try {
          const res = await resolveCityToPostalCodes(raw, selectedCountry);
          if (res && res.postalCodes && res.postalCodes.length > 0) {
            activeZips = res.postalCodes;
            setZipcodes(res.postalCodes);
            if (res.country) {
              const matchedCountry = COUNTRIES.find(c => c.name.toLowerCase() === res.country.toLowerCase());
              if (matchedCountry) {
                targetCountry = matchedCountry.name;
                setSelectedCountry(matchedCountry.name);
              }
            }
          } else {
            activeZips = [raw];
            setZipcodes([raw]);
          }
        } catch (err) {
          activeZips = [raw];
        } finally {
          setIsResolvingCity(false);
          setCurrentZipInput('');
        }
      } else {
        const parts = raw.split(/[,]+/).map(p => p.trim()).filter(Boolean);
        activeZips = Array.from(new Set([...activeZips, ...parts]));
        setZipcodes(activeZips);
        setCurrentZipInput('');
      }
    }

    if (activeZips.length === 0) return;

    onSearch({
      country: targetCountry,
      zipcodes: activeZips,
      category: category === 'All Businesses' ? '' : category,
      keyword: customKeyword,
      limit,
    });
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm transition-all relative">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top bar: Country Selection, Postal Code/City Tag Box, Category selection */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Country Selector */}
          <div className="md:col-span-3 flex flex-col justify-start">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
              Target Country / Jurisdiction
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="h-[46px] px-3.5 border border-slate-200 rounded-2xl bg-slate-50/70 hover:bg-slate-100/70 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Postal Code / City Auto-Find Tag Box */}
          <div className="md:col-span-4 flex flex-col justify-start relative" ref={containerRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Postal Codes / City Auto-Find
              </label>
              <div className="flex items-center gap-2">
                {zipcodes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[10px] text-slate-400 hover:text-red-600 font-semibold cursor-pointer transition-colors"
                  >
                    Clear all
                  </button>
                )}
                {isResolvingCity && (
                  <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Finding postal codes...
                  </span>
                )}
              </div>
            </div>

            <div className="min-h-[46px] p-1.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex flex-wrap items-center gap-1.5 relative">
              {zipcodes.map(zip => (
                <span
                  key={zip}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200 text-slate-900 text-xs font-semibold font-mono border border-slate-300 shadow-2xs group"
                >
                  <span>{zip}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveZipcode(zip)}
                    className="text-slate-500 hover:text-slate-900 hover:bg-slate-300 rounded-full p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <div className="flex-1 min-w-[140px] flex items-center gap-1">
                <input
                  type="text"
                  placeholder={zipcodes.length === 0 ? "Enter city (e.g. Miami, Berlin, Paris) or postal code..." : "Add code or city..."}
                  value={currentZipInput}
                  onChange={(e) => setCurrentZipInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-none text-xs text-slate-800 focus:outline-hidden px-2 py-1 placeholder:text-slate-400 font-medium"
                />

                {/* Instant Action button when a city name is typed */}
                {currentZipInput.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isLikelyPostalCode(currentZipInput)) {
                        handleAutoFindCityPostalCodes(currentZipInput, true, true);
                      } else {
                        handleAddZipcode();
                      }
                    }}
                    disabled={isResolvingCity}
                    className="shrink-0 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    title={!isLikelyPostalCode(currentZipInput) ? `Navigate and find businesses in ${currentZipInput}` : 'Add postal code'}
                  >
                    {!isLikelyPostalCode(currentZipInput) ? (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>Go to City</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Instant City Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 animate-in fade-in slide-in-from-top-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Detected Cities & Postal Codes</span>
                  <span className="text-indigo-600 font-mono">1-Click Auto-Fill</span>
                </div>
                <div className="space-y-1">
                  {suggestions.map((item) => (
                    <button
                      key={`${item.city}-${item.country}`}
                      type="button"
                      onClick={() => handleApplyCitySuggestion(item)}
                      className="w-full text-left p-2 rounded-xl hover:bg-indigo-50/80 active:bg-indigo-100 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{item.flag || '📍'}</span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                            {item.city}, <span className="text-slate-500 font-normal">{item.country}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            Postal Codes: {item.postalCodes.join(', ')}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        Auto-fill
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Industry Category Dropdown */}
          <div className="md:col-span-3 flex flex-col justify-start">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              Industry Sector
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-[46px] px-3.5 border border-slate-200 rounded-2xl bg-slate-50/70 hover:bg-slate-100/70 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {POPULAR_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Custom Keyword / Modifier */}
          <div className="md:col-span-2 flex flex-col justify-start">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Modifier (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. premier, advisory"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              className="h-[46px] px-3.5 border border-slate-200 rounded-2xl bg-slate-50/70 hover:bg-slate-100/70 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Dynamic City Postal Resolution Feedback Banner */}
        {cityFeedback && (
          <div className={`p-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 border transition-all animate-in fade-in ${
            cityFeedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : cityFeedback.type === 'info'
              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {cityFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
              <span className="font-medium">{cityFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setCityFeedback(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick City Chips & Instructions */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-indigo-500" />
            Instant City Postal Lookup:
          </span>
          {QUICK_CITY_CHIPS.map(chip => (
            <button
              key={chip.city}
              type="button"
              onClick={() => handleAutoFindCityPostalCodes(chip.city, true, true)}
              disabled={isResolvingCity}
              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 hover:bg-slate-900 hover:text-white hover:border-slate-800 text-slate-700 transition-all border border-slate-200/80 cursor-pointer active:scale-95 shadow-2xs"
            >
              📍 {chip.city}
            </button>
          ))}
          <span className="text-[10px] text-slate-400 hidden xl:inline">
            (Enter any global city in the postal code box to instantly travel there)
          </span>
        </div>

        {/* Bottom bar: Quick Global Presets & Submit Button */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Global Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-slate-500" /> Curated Hubs:
            </span>
            {PRESET_GLOBAL_LOCATIONS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition-all border border-slate-200/60 cursor-pointer active:scale-95 shadow-2xs"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Actions: Start Fresh & Search Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {(zipcodes.length > 0 || hasActiveResults) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs border border-slate-200/80"
                title="Clear all postal codes and reset to a clean slate"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Start Fresh</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || isResolvingCity || (zipcodes.length === 0 && !currentZipInput.trim())}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {isLoading || isResolvingCity ? (
                <>
                  <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                  <span>{isResolvingCity ? 'Finding Postal Codes...' : 'Scanning Worldwide Radar...'}</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>Scan Businesses</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
