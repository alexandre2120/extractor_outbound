import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outbound — plan-first microSaaS",
  description:
    "Descoberta, enriquecimento e ativação de leads B2B orientada por plano.",
};

const nav = [
  { href: "/", label: "Painel" },
  { href: "/plans", label: "Planos" },
  { href: "/companies", label: "Empresas" },
  { href: "/campaigns", label: "Campanhas" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-surface">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-7">
                <Link
                  href="/"
                  className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground font-mono text-xs font-bold text-background">
                    C
                  </span>
                  Cadência
                </Link>
                <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
                  {nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Plan-first outbound
              </span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-7">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-6xl border-t border-border px-6 py-4 text-xs text-muted-foreground">
            plan-first · registry &gt; website &gt; ai
          </footer>
        </div>
      </body>
    </html>
  );
}
