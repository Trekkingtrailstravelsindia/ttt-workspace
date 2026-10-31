// Secondary tab strip that groups related pages under a hub (Settings,
// Accounting). Rendered once in the authenticated Shell above the Outlet, so
// every page in a group shows the same sub-navigation. Tabs are filtered by
// the current user's role, matching the main sidebar.
import { Link, useRouterState } from "@tanstack/react-router";
import { useCurrentRole } from "@/hooks/use-current-role";
import { cn } from "@/lib/utils";
import {
  Settings, UserCog, ClipboardList, Activity,
  BookOpen, Calculator, BarChart3, Wallet, ArrowLeftRight, Camera,
} from "lucide-react";

type Tab = { to: string; label: string; icon: typeof Settings; roles: string[] };

export const SECTION_GROUPS: Record<string, { title: string; tabs: Tab[] }> = {
  settings: {
    title: "Settings",
    tabs: [
      { to: "/settings", label: "Settings", icon: Settings, roles: ["admin", "ops", "sales"] },
      { to: "/team", label: "Team", icon: UserCog, roles: ["admin"] },
      { to: "/work-log", label: "Work log", icon: ClipboardList, roles: ["admin", "ops", "sales"] },
      { to: "/team-activity", label: "Team activity", icon: Activity, roles: ["admin", "ops"] },
    ],
  },
  accounting: {
    title: "Accounting",
    tabs: [
      { to: "/accounting", label: "Accounting", icon: BookOpen, roles: ["admin", "ops", "accountant"] },
      { to: "/cost-calc", label: "Cost calculator", icon: Calculator, roles: ["admin", "ops"] },
      { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "ops"] },
      { to: "/cash-flow", label: "Cash flow", icon: Wallet, roles: ["admin", "ops", "accountant"] },
      { to: "/purchase-sell", label: "Purchase & Sell", icon: ArrowLeftRight, roles: ["admin", "ops", "accountant"] },
      { to: "/expenses", label: "Expenses (snap)", icon: Camera, roles: ["admin", "ops", "sales"] },
    ],
  },
};

// Map a pathname to the group it belongs to (if any).
export function groupForPath(path: string): keyof typeof SECTION_GROUPS | null {
  for (const key of Object.keys(SECTION_GROUPS) as (keyof typeof SECTION_GROUPS)[]) {
    if (SECTION_GROUPS[key].tabs.some((t) => t.to === path)) return key;
  }
  return null;
}

export function SectionTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { roles, isLoading } = useCurrentRole();
  const group = groupForPath(path);
  if (!group) return null;

  const tabs = SECTION_GROUPS[group].tabs.filter(
    (t) => isLoading || roles.length === 0 || t.roles.some((r) => roles.includes(r as any)),
  );
  if (tabs.length <= 1) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b">
      {tabs.map((t) => {
        const active = path === t.to;
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
