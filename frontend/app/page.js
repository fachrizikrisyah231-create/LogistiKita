import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-canvas text-ink py-3xl px-3xl md:py-[80px]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-3xl items-center">
          <div>
            <h1 className="text-display-xxl font-bold leading-tight mb-lg tracking-tight">
              Kirim paket aman, cepat, dan transparan.
            </h1>
            <p className="text-body-lg text-body mb-xl max-w-[448px]">
              Layanan logistik modern dengan jangkauan luas dan kepastian harga. Lacak setiap pergerakan paket Anda secara real-time.
            </p>
            <Link 
              href="/tracking"
              className="inline-block bg-primary text-on-primary font-medium text-button-large rounded-xl px-xl py-lg hover:opacity-90 transition-opacity"
            >
              Lacak Paket Anda
            </Link>
          </div>
          <div className="bg-canvas-soft rounded-xl aspect-4/3 flex items-center justify-center p-2xl">
            {/* Placeholder for editorial illustration */}
            <div className="text-center">
              <span className="text-display-md text-mute font-bold">LogistiKita</span>
              <p className="text-body-md text-mute mt-sm">Ilustrasi Pengiriman</p>
            </div>
          </div>
        </div>
      </section>

      {/* Keunggulan Section (Dark Band) */}
      <section className="bg-ink text-on-dark py-3xl px-3xl">
        <div className="max-w-[1280px] mx-auto">
          <h2 className="text-display-xl font-bold mb-3xl text-center">Mengapa memilih LogistiKita?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2xl">
            <div className="bg-black-elevated p-2xl rounded-xl">
              <h3 className="text-display-sm font-bold mb-md">Tracking Real-time</h3>
              <p className="text-body-md text-on-dark/80">
                Ketahui posisi pasti paket Anda kapan saja. Kami memberikan pembaruan status pengiriman secara akurat.
              </p>
            </div>
            <div className="bg-black-elevated p-2xl rounded-xl">
              <h3 className="text-display-sm font-bold mb-md">Ongkir Transparan</h3>
              <p className="text-body-md text-on-dark/80">
                Tidak ada biaya tersembunyi. Semua kalkulasi biaya pengiriman dan fee layanan ditampilkan di awal.
              </p>
            </div>
            <div className="bg-black-elevated p-2xl rounded-xl">
              <h3 className="text-display-sm font-bold mb-md">Jangkauan Luas</h3>
              <p className="text-body-md text-on-dark/80">
                Jaringan distribusi ekstensif memastikan paket Anda sampai ke seluruh penjuru daerah dengan aman.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Layanan Kami Section */}
      <section className="bg-canvas text-ink py-3xl px-3xl md:py-[80px]">
        <div className="max-w-[1280px] mx-auto">
          <h2 className="text-display-xl font-bold mb-3xl">Layanan Kami</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2xl">
            
            <div className="bg-canvas-soft p-2xl rounded-xl border border-surface-pressed flex flex-col">
              <div className="flex-grow">
                <h3 className="text-display-md font-bold mb-sm">Reguler</h3>
                <p className="text-body-md text-body mb-lg">Estimasi tiba 2-3 hari. Pilihan paling hemat untuk pengiriman harian Anda.</p>
              </div>
              <Link 
                href="/tracking"
                className="mt-auto inline-block bg-canvas text-ink text-center font-medium text-button-md rounded-pill px-md py-md hover:bg-surface-pressed transition-colors"
              >
                Gunakan Layanan
              </Link>
            </div>

            <div className="bg-ink text-on-dark p-2xl rounded-xl flex flex-col shadow-lg">
              <div className="flex-grow">
                <div className="inline-block bg-canvas text-ink text-caption font-bold px-sm py-xxs rounded-pill mb-md">
                  POPULER
                </div>
                <h3 className="text-display-md font-bold mb-sm">Sameday</h3>
                <p className="text-body-md text-on-dark/80 mb-lg">Tiba di hari yang sama. Prioritas pengiriman tercepat untuk paket mendesak.</p>
              </div>
              <Link 
                href="/tracking"
                className="mt-auto inline-block bg-canvas text-ink text-center font-medium text-button-md rounded-pill px-md py-md hover:bg-surface-pressed transition-colors"
              >
                Gunakan Layanan
              </Link>
            </div>

            <div className="bg-canvas-soft p-2xl rounded-xl border border-surface-pressed flex flex-col">
              <div className="flex-grow">
                <h3 className="text-display-md font-bold mb-sm">Kargo</h3>
                <p className="text-body-md text-body mb-lg">Solusi hemat untuk pengiriman barang dalam jumlah besar atau muatan berat.</p>
              </div>
              <Link 
                href="/tracking"
                className="mt-auto inline-block bg-canvas text-ink text-center font-medium text-button-md rounded-pill px-md py-md hover:bg-surface-pressed transition-colors"
              >
                Gunakan Layanan
              </Link>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
