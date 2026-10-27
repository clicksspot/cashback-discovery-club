import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Leaf, Menu, X } from "lucide-react";
import { SearchBox } from "./SearchBox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { settingsQuery } from "@/lib/public.functions";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Logo({ name, light = false }: { name: string; light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-display text-xl font-extrabold ${light ? "text-forest-foreground" : "text-forest"}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime text-lime-foreground">
        <Leaf className="h-4 w-4" />
      </span>
      {name}
    </span>
  );
}

function SiteHeader() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      {settings.announcement && (
        <div className="bg-forest px-4 py-1.5 text-center text-xs font-medium text-forest-foreground">
          {settings.announcement}
        </div>
      )}
      <div className="container-page flex h-16 items-center gap-4">
        <Link to="/" className="shrink-0">
          <Logo name={settings.site_name} />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <Link to="/stores" search={{}} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary" activeProps={{ className: "bg-secondary text-foreground" }}>
            All stores
          </Link>
          {settings.show_deals && (
            <Link to="/deals" search={{}} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary" activeProps={{ className: "bg-secondary text-foreground" }}>
              Deals & coupons
            </Link>
          )}
          <Link to="/how-it-works" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary" activeProps={{ className: "bg-secondary text-foreground" }}>
            How it works
          </Link>
          <Link to="/amazon-deals" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary" activeProps={{ className: "bg-secondary text-foreground" }}>Amazon USA</Link>
          <Link to="/refer" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary" activeProps={{ className: "bg-secondary text-foreground" }}>
            Refer & earn
          </Link>
        </nav>
        <SearchBox className="ml-auto hidden max-w-xs flex-1 lg:block" />
        <div className="ml-auto hidden items-center gap-2 md:flex lg:ml-0">
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button asChild variant="forest" size="sm">
                <Link to="/account">My cashback</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>Join free</Link>
              </Button>
            </>
          )}
        </div>
        <button className="ml-auto md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container-page flex flex-col gap-2 py-4">
            <SearchBox onDone={() => setOpen(false)} />
            <Link to="/stores" search={{}} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 font-medium">All stores</Link>
            {settings.show_deals && <Link to="/deals" search={{}} onClick={() => setOpen(false)} className="rounded-md px-2 py-2 font-medium">Deals & coupons</Link>}
            <Link to="/how-it-works" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 font-medium">How it works</Link>
            <Link to="/refer" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 font-medium">Refer & earn</Link>
            <Link to="/help" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 font-medium">Help</Link>
            <Link to="/amazon-deals" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 font-medium">Amazon USA deals</Link>
            {user ? (
              <>
                {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 font-medium">Admin</Link>}
                <Link to="/account" onClick={() => setOpen(false)} className="rounded-md px-2 py-2 font-medium">My cashback</Link>
              </>
            ) : (
              <Button asChild>
                <Link to="/auth" onClick={() => setOpen(false)}>Sign in / Join free</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SiteFooter() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  return (
    <footer className="mt-20 bg-forest text-forest-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo name={settings.site_name} light />
          <p className="mt-4 max-w-sm text-sm text-forest-foreground/70">{settings.tagline}</p>
          <p className="mt-4 max-w-sm text-sm text-forest-foreground">As an Amazon Associate I earn from qualifying purchases.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-forest-foreground/70">
            <li><Link to="/stores" search={{}} className="hover:text-lime">All stores</Link></li>
            {settings.show_deals && <li><Link to="/deals" search={{}} className="hover:text-lime">Deals & coupons</Link></li>}
            <li><Link to="/how-it-works" className="hover:text-lime">How it works</Link></li>
            <li><Link to="/refer" className="hover:text-lime">Refer a friend</Link></li>
            <li><Link to="/amazon-deals" className="hover:text-lime">Amazon USA deals</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Help</h4>
          <ul className="mt-3 space-y-2 text-sm text-forest-foreground/70">
            <li><Link to="/help" className="hover:text-lime">Help centre & FAQ</Link></li>
            <li><Link to="/claims" className="hover:text-lime">Missing cashback</Link></li>
            <li><Link to="/terms" className="hover:text-lime">Terms of use</Link></li>
            <li><Link to="/privacy" className="hover:text-lime">Privacy policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Account</h4>
          <ul className="mt-3 space-y-2 text-sm text-forest-foreground/70">
            <li><Link to="/account" className="hover:text-lime">My cashback</Link></li>
            <li><Link to="/favorites" className="hover:text-lime">Favourite stores</Link></li>
            <li><Link to="/auth" className="hover:text-lime">Sign in</Link></li>
            {settings.support_email && (
              <li><a href={`mailto:${settings.support_email}`} className="hover:text-lime">{settings.support_email}</a></li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-forest-foreground/10">
        <div className="container-page py-5 text-xs text-forest-foreground/60">
          © {new Date().getFullYear()} {settings.site_name}. Cashback depends on each store confirming your purchase.
        </div>
      </div>
    </footer>
  );
}
