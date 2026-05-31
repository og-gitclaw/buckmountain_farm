import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Not found — Buck Mountain Cannabis" };

export default function NotFound() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 grid place-items-center p-6">
      <div className="max-w-md text-center space-y-6">
        <Image
          src="/brand/logo.png"
          alt=""
          width={240}
          height={240}
          className="mx-auto h-32 w-auto opacity-80"
        />
        <h1 className="text-4xl md:text-5xl font-bold">Off the map.</h1>
        <p className="text-white/70 text-sm">
          That page doesn&rsquo;t exist — or got moved when we rebuilt the
          site. Try one of these.
        </p>
        <ul className="flex flex-wrap gap-3 justify-center text-sm">
          <Tile href="/">Home</Tile>
          <Tile href="/strains">Strains</Tile>
          <Tile href="/store">Store</Tile>
          <Tile href="/blog">Blog</Tile>
          <Tile href="/loyalty">Loyalty</Tile>
          <Tile href="/coa">COA lookup</Tile>
        </ul>
      </div>
    </main>
  );
}

function Tile({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-white/15 hover:border-white/40 px-3 py-2"
    >
      {children}
    </Link>
  );
}
