"use client";

import { useState } from "react";
import TrackingForm from "@/components/tracking/TrackingForm";
import TrackingTimeline from "@/components/tracking/TrackingTimeline";
import ShipmentSummary from "@/components/tracking/ShipmentSummary";

export default function TrackingPage() {
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState("");

  const handleTrack = async (orderId) => {
    if (!orderId || orderId.length < 5) {
      setError("Order ID tidak valid. Silakan coba lagi dengan Order ID yang benar.");
      return;
    }

    setLoading(true);
    setError("");
    setTrackingData(null);

    try {
      // 1. Dapatkan token dummy (USR-001) untuk bisa mengakses API Tracking
      // Dalam sistem riil, token berasal dari session login user.
      const tokenRes = await fetch(`http://localhost:5500/trigger/generate-token?user_id=USR-001`);
      const tokenData = await tokenRes.json();
      const token = tokenData.token;

      // 2. Akses API Tracking LogistiKita
      const trackingRes = await fetch(`http://localhost:3001/logistikita/tracking_status?order_id=${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await trackingRes.json();

      if (!result.success) {
        setError(result.error?.message || "Pengiriman tidak ditemukan.");
        setLoading(false);
        return;
      }

      const data = result.data;
      
      // Map response ke format komponen UI
      const mappedData = {
        orderId: data.order_id,
        destination: data.alamat_tujuan,
        transactionValue: data.nilai_transaksi,
        shippingCost: data.ongkir,
        serviceFee: data.fee_layanan,
        statusHistory: data.riwayat_status.map(riwayat => ({
          status: riwayat.status,
          description: riwayat.keterangan,
          timestamp: riwayat.timestamp
        }))
      };

      setTrackingData(mappedData);
    } catch (err) {
      console.error(err);
      setError("Gagal menghubungi server. Pastikan Backend dan Mock Server berjalan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-canvas-soft">
      {/* Hero Banner Area for Tracking Page */}
      <section className="bg-ink text-on-dark py-3xl px-3xl pb-[80px]">
        <div className="max-w-[1280px] mx-auto text-center">
          <h1 className="text-display-xl font-bold mb-md">Lacak Paket Anda</h1>
          <p className="text-body-lg text-on-dark/80 max-w-[672px] mx-auto">
            Masukkan nomor resi atau Order ID untuk melihat status pengiriman paket Anda secara real-time.
          </p>
        </div>
      </section>

      {/* Tracking Content */}
      <section className="flex-grow px-3xl pb-3xl">
        <div className="max-w-[1280px] mx-auto">
          <TrackingForm onTrack={handleTrack} />

          <div className="mt-3xl pt-xl max-w-[1024px] mx-auto">
            {loading && (
              <div className="text-center py-2xl">
                <div className="inline-block w-8 h-8 border-4 border-surface-pressed border-t-primary rounded-full animate-spin mb-sm"></div>
                <p className="text-body-md text-mute">Mencari data pengiriman...</p>
              </div>
            )}

            {error && (
              <div className="bg-[#fde8e8] text-[#c81e1e] p-lg rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            {trackingData && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2xl">
                <div className="md:col-span-2">
                  <TrackingTimeline statusHistory={trackingData.statusHistory} />
                </div>
                <div className="md:col-span-1">
                  <ShipmentSummary data={trackingData} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
