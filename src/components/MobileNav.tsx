import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, ChefHat, Calendar, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };
const items: NavItem[] = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/comandas", label: "Comanda", icon: ClipboardList },
  { to: "/producao", label: "Produção", icon: ChefHat },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/financeiro", label: "Financ.", icon: Wallet, adminOnly: true },
];

export function MobileNav() {
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex justify-around py-2">
      {items.map((item) => {
        if (item.adminOnly && !isAdmin) return null;
        const Icon = item.icon;
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center gap-1 text-[10px] px-3 py-1 rounded-md ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
