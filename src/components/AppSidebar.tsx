import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  ChefHat,
  Calendar,
  Wallet,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/format";
import logoFatima from "@/assets/logoFatima.jpg";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const items: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/comandas", label: "Nova Comanda", icon: ClipboardList },
  { to: "/producao", label: "Produção", icon: ChefHat },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
];

export function AppSidebar() {
  const { signOut, user, roles, isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground sticky top-0">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src={logoFatima}
            alt="Logo Fátima Confeitaria"
            className="w-12 h-12 rounded-xl object-cover shadow-sm"
          />

          <div>
            <div className="font-serif text-lg leading-tight">Fátima</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Confeitaria
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          if (item.adminOnly && !isAdmin) return null;

          const active = pathname === item.to;
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="text-xs">
          <div className="font-medium truncate">{user?.email}</div>
          <div className="text-muted-foreground">
            {roles.length
              ? roles.map((r) => roleLabels[r] ?? r).join(", ")
              : "Sem permissão"}
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  );
}