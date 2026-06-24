"use client";

import { useState, useEffect } from "react";

export default function TrackingForm({ onTrack, initialOrderId = "" }) {
  const [orderId, setOrderId] = useState(initialOrderId);

  useEffect(() => {
    if (initialOrderId && !orderId) {
      setOrderId(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (orderId.trim()) {
      onTrack(orderId);
    }
  };

  return (
    <div className="bg-canvas p-lg rounded-xl shadow-md border border-surface-pressed max-w-[576px] mx-auto -mt-3xl relative z-10">
      <h2 className="text-display-sm font-bold mb-md">Lacak Paket</h2>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-sm">
        <div className="flex-grow bg-canvas-soft rounded-md px-lg py-sm flex items-center border-2 border-transparent focus-within:border-primary transition-colors">
          <svg className="w-5 h-5 text-mute mr-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Masukkan Nomor Resi / Order ID"
            className="bg-transparent border-none outline-none w-full text-body-md text-ink placeholder-mute"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            required
          />
        </div>
        <button 
          type="submit"
          className="bg-primary text-on-primary font-medium text-button-md rounded-pill px-xl py-md hover:opacity-90 transition-opacity whitespace-nowrap flex items-center justify-center"
        >
          Lacak
        </button>
      </form>
    </div>
  );
}
