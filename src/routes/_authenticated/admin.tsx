import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  FolderTree,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Settings,
  ShieldAlert,
  Store,
  Tag,
  Users,
  Wallet,
  LifeBuoy,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { settingsQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel" },
      { name: "description", content: "Manage stores, cashback, payouts and settings." },
      { property: "og:title", content: "Admin panel" },
      { property: "og:description", content: "Manage stores, cashback, payouts and settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/stores", label: "Stores", icon: Store },
  { to: "/admin/offers", label: "Deals & coupons", icon: Tag },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/transactions", label: "Cashback & sales", icon: ArrowLeftRight },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
  { to: "/admin/claims", label: "Missing cashback", icon: LifeBuoy },
  { to: "/admin/users", label: "Members", icon: Users },
  { to: "/admin/sync", label: "Impact sync", icon: RefreshCw },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const { isAdmin, adminLoading, loading } = useAuth();
  const { data: settings } = useSuspenseQuery(settingsQuery);

  if (loading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="text-2xl font-extrabold">Admins only</h1>
        <p className="text-muted-foreground">Your account doesn't have access to the admin panel.</p>
        <Button asChild><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <Link to="/" className="px-2 py-3"><Logo name={settings.site_name} light /></Link>
        <p className="mt-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Admin</p>
        <nav className="mt-2 flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n ? n.exact : false }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground" }}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent">
          <ExternalLink className="h-4 w-4" /> View site
        </Link>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-card p-2 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n ? n.exact : false }} className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium" activeProps={{ className: "bg-forest text-forest-foreground" }}>
              {n.label}
            </Link>
          ))}
        </div>
        <div className="p-5 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
