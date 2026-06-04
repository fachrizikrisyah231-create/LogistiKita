import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-canvas text-ink py-lg px-3xl shadow-sm">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between">
        <Link href="/" className="text-display-md font-bold hover:opacity-80 transition-opacity">
          LogistiKita
        </Link>
        <nav className="hidden md:flex gap-md items-center">
          <Link href="/" className="font-medium text-body-md-strong hover:text-mute transition-colors">
            Beranda
          </Link>
          <Link href="/tracking" className="font-medium text-body-md-strong hover:text-mute transition-colors">
            Lacak Paket
          </Link>
          <Link 
            href="/tracking" 
            className="bg-primary text-on-primary font-medium text-button-md rounded-pill px-md py-sm hover:opacity-90 transition-opacity ml-lg"
          >
            Lacak Sekarang
          </Link>
        </nav>
        {/* Mobile Nav Toggle */}
        <div className="md:hidden">
          <Link 
            href="/tracking" 
            className="bg-primary text-on-primary font-medium text-button-md rounded-pill px-md py-sm hover:opacity-90 transition-opacity"
          >
            Lacak
          </Link>
        </div>
      </div>
    </header>
  );
}
