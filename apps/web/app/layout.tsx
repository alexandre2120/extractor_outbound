import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outbound — plan-first microSaaS",
  description:
    "Descoberta, enriquecimento e ativação de leads B2B orientada por plano.",
};

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/plans", label: "Plans" },
  { href: "/companies", label: "Companies" },
  { href: "/campaigns", label: "Campaigns" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              outbound<span className="text-muted-foreground">.local</span>
            </Link>
            <nav className="flex gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
          <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
            plan-first · registry &gt; website &gt; ai · Camada 1
          </footer>
        </div>
      </body>
    </html>
  );
}
