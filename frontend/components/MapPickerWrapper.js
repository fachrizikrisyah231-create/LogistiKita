"use client";

import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-md overflow-hidden border border-surface-pressed flex items-center justify-center bg-canvas-soft text-mute">
      <span className="animate-pulse">Memuat Peta...</span>
    </div>
  )
});

export default MapPicker;
