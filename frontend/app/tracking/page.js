"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TrackingForm from "@/components/tracking/TrackingForm";
import TrackingTimeline from "@/components/tracking/TrackingTimeline";
import ShipmentSummary from "@/components/tracking/ShipmentSummary";
import BranchRouteProgress from "@/components/tracking/BranchRouteProgress";
import api from "@/lib/api";

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('order_id');
  
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState("");
  const [activeOrderId, setActiveOrderId] = useState("");

  useEffect(() => {
    if (initialOrderId && !activeOrderId && !trackingData) {
      handleTrack(initialOrderId);
    }
  }, [initialOrderId]);

  const fetchTrackingData = useCallback(async (orderId, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setError("");
      setTrackingData(null);
    }

    try {
      const trackingRes = await api.get(`/tracking_status/${orderId}`);
      const data = trackingRes.data.data;
      
      const mappedData = {
        orderId: data.order_id,
        origin: data.alamat_asal,
        destination: data.alamat_tujuan,
        statusHistory: data.riwayat_status || [],
        ruteCabang: data.rute_cabang || [],
        tipePengiriman: data.tipe_pengiriman
      };

      setTrackingData(mappedData);
      
      if (isInitial) {
        setActiveOrderId(orderId);
      }
    } catch (err) {
      console.error(err);
      if (isInitial) setError("Order ID tidak ditemukan atau terjadi kesalahan server.");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const handleTrack = (orderId) => {
    if (!orderId || orderId.length < 5) {
      setError("Order ID tidak valid. Silakan coba lagi dengan Order ID yang benar.");
      return;
    }
    fetchTrackingData(orderId, true);
  };

  useEffect(() => {
    if (!activeOrderId) return;
    const interval = setInterval(() => {
      fetchTrackingData(activeOrderId, false);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeOrderId, fetchTrackingData]);

  return (
    <div className="flex flex-col min-h-screen bg-canvas-soft">
      <section className="bg-ink text-on-dark py-3xl px-3xl pb-[80px]">
        <div className="max-w-[1280px] mx-auto text-center">
          <h1 className="text-display-xl font-bold mb-md">Lacak Paket Anda</h1>
          <p className="text-body-lg text-on-dark/80 max-w-[672px] mx-auto">
            Masukkan nomor resi atau Order ID untuk melihat status pengiriman paket Anda secara real-time.
          </p>
        </div>
      </section>

      <section className="flex-grow px-3xl pb-3xl">
        <div className="max-w-[1280px] mx-auto">
          <TrackingForm onTrack={handleTrack} initialOrderId={initialOrderId || activeOrderId || ""} />

          <div className="mt-3xl pt-xl max-w-[1024px] mx-auto">
            {loading && (
              <div className="text-center py-2xl">
                <div className="inline-block w-8 h-8 border-4 border-surface-pressed border-t-primary rounded-full animate-spin mb-sm"></div>
                <p className="text-body-md text-mute">Mencari data pengiriman...</p>
              </div>
            )}

            {error && (
              <div className="bg-[#fde8e8] text-[#c81e1e] p-lg rounded-xl text-center font-medium shadow-sm">
                {error}
              </div>
            )}

            {trackingData && !loading && (
              <>
                <BranchRouteProgress routeCabang={trackingData.ruteCabang} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2xl">
                  <div className="md:col-span-2">
                    <TrackingTimeline statusHistory={trackingData.statusHistory} />
                  </div>
                  <div className="md:col-span-1">
                    <div className="bg-canvas p-2xl rounded-xl border border-surface-pressed shadow-sm">
                      <h3 className="text-display-sm font-bold mb-md">Info Pengiriman</h3>
                      <div className="space-y-4 text-body-md text-body">
                        <div>
                          <p className="font-bold text-ink">Order ID</p>
                          <p>{trackingData.orderId}</p>
                        </div>
                        <div>
                          <p className="font-bold text-ink">Tipe Layanan</p>
                          <p className="capitalize">{trackingData.tipePengiriman}</p>
                        </div>
                        <div className="h-px bg-surface-pressed my-2"></div>
                        <div>
                          <p className="font-bold text-ink">Asal</p>
                          <p>{trackingData.origin}</p>
                        </div>
                        <div>
                          <p className="font-bold text-ink">Tujuan</p>
                          <p>{trackingData.destination}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-body-md text-mute">Memuat pelacakan...</div>}>
      <TrackingContent />
    </Suspense>
  );
}
