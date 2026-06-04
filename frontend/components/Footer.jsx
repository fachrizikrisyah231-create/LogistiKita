import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-on-dark py-3xl px-3xl">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-2xl">
        <div>
          <h2 className="text-display-sm font-bold mb-md">LogistiKita</h2>
          <p className="text-body-sm text-mute">
            Bagian dari ekosistem simulasi UMKM. Pengiriman cepat, aman, dan terpercaya untuk seluruh kebutuhan logistik Anda.
          </p>
        </div>
        <div>
          <h3 className="text-body-md-strong font-bold mb-md">Layanan Kami</h3>
          <ul className="space-y-sm">
            <li>
              <Link href="#" className="text-body-sm text-mute hover:text-on-dark transition-colors">
                Reguler
              </Link>
            </li>
            <li>
              <Link href="#" className="text-body-sm text-mute hover:text-on-dark transition-colors">
                Sameday
              </Link>
            </li>
            <li>
              <Link href="#" className="text-body-sm text-mute hover:text-on-dark transition-colors">
                Kargo
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-body-md-strong font-bold mb-md">Kontak Fiktif</h3>
          <ul className="space-y-sm text-body-sm text-mute">
            <li>Email: cs@logistikita.sim</li>
            <li>Telepon: 0800-1-LOGISTIK</li>
            <li>Jam Operasional: Senin - Minggu (08:00 - 20:00)</li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto mt-3xl pt-xl border-t border-hairline-mid flex flex-col md:flex-row justify-between items-center text-caption text-mute">
        <p>&copy; {new Date().getFullYear()} LogistiKita. All rights reserved.</p>
        <div className="flex gap-md mt-sm md:mt-0">
          <Link href="#" className="hover:text-on-dark transition-colors">Syarat & Ketentuan</Link>
          <Link href="#" className="hover:text-on-dark transition-colors">Kebijakan Privasi</Link>
        </div>
      </div>
    </footer>
  );
}
