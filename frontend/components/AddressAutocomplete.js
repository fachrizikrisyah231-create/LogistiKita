"use client";

import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onSelectLocation, 
  placeholder = "Masukkan alamat lengkap..." 
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (!isTypingRef.current) return;

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=5`);
        const data = await res.json();
        setResults(data);
        setShowDropdown(true);
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleChange = (e) => {
    isTypingRef.current = true;
    setQuery(e.target.value);
    onChange(e.target.value);
  };

  const handleSelect = (item) => {
    isTypingRef.current = false;
    const address = item.display_name;
    setQuery(address);
    onChange(address);
    setShowDropdown(false);
    
    if (onSelectLocation) {
      onSelectLocation({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      });
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input 
        type="text" 
        placeholder={placeholder}
        required
        className="w-full bg-canvas-soft border border-transparent rounded-md p-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:bg-canvas"
        value={query} 
        onChange={handleChange}
        onFocus={() => { if(results.length > 0) setShowDropdown(true) }}
      />
      {loading && (
        <div className="absolute right-4 top-4 text-mute animate-pulse text-sm">Mencari...</div>
      )}
      
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-canvas border border-surface-pressed rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((item, idx) => (
            <div 
              key={idx}
              onClick={() => handleSelect(item)}
              className="px-4 py-3 hover:bg-canvas-soft cursor-pointer flex items-start gap-3 border-b border-surface-pressed last:border-0"
            >
              <MapPin className="text-primary mt-1 flex-shrink-0" size={18} />
              <div className="text-body-sm text-ink">{item.display_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
