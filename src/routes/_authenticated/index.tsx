import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatBRL, formatDateBR } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ChefHat, Calendar, Wallet, ClipboardList, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Fátima Tortas e Bolos" },
      { name: "description", content: "Visão geral dos pedidos, agenda e financeiro." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().slice(0, 10);

      const [todayOrders, monthOrders, pending, recent] = await Promise.all([
        supabase.from("orders").select("value, payment_status").eq("order_date", today),
        supabase.from("orders").select("value, payment_status").gte("order_date", monthStartStr),
        supabase.from("orders").select("id").eq("status", "agendado"),
        supabase
          .from("orders")
          .select("id, order_date, order_time, value, status, payment_status, flavor, clients(name)")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const sum = (rows: { value: number | string }[] | null) =>
        (rows ?? []).reduce((a, r) => a + Number(r.value || 0), 0);

      return {
        todayTotal: sum(todayOrders.data ?? []),
        monthTotal: sum(monthOrders.data ?? []),
        pendingCount: pending.data?.length ?? 0,
        recent: recent.data ?? [],
      };
    },
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-1">Bem-vindo Fátima Tortas e Bolos</h1>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* <StatCard icon={Wallet} label="Total do dia" value={formatBRL(stats?.todayTotal)} tone="primary" /> */}
        {/* <StatCard icon={TrendingUp} label="Total do mês" value={formatBRL(stats?.monthTotal)} tone="success" /> */}
        <StatCard icon={Calendar} label="Agendados" value={String(stats?.pendingCount ?? 0)} tone="warning" />
        <StatCard
          icon={ClipboardList}
          label="Nova comanda"
          value="Criar"
          tone="muted"
          onClick={() => navigate({ to: "/comandas" })}
        />
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <QuickLink onClick={() => navigate({ to: "/producao" })} icon={ChefHat} title="Acompanhar Produção" desc="Kanban de pedidos em andamento" />
        <QuickLink onClick={() => navigate({ to: "/agenda" })} icon={Calendar} title="Agenda do mês" desc="Veja todos os pedidos no calendário" />
        {isAdmin && (
          <QuickLink onClick={() => navigate({ to: "/financeiro" })} icon={Wallet} title="Financeiro" desc="Entradas, pendências e relatórios" />
        )}
      </section>

      <section className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Pedidos recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase tracking-wider">
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3">Data / Hora</th>
                <th className="text-left py-2 pr-3">Cliente</th>
                <th className="text-left py-2 pr-3">Sabor</th>
                <th className="text-left py-2 pr-3">Status</th>
                <th className="text-left py-2 pr-3">Pgto.</th>
                <th className="text-right py-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recent ?? []).map((o: any) => (
                <tr key={o.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-3">
                    {formatDateBR(o.order_date)} · {String(o.order_time).slice(0, 5)}
                  </td>
                  <td className="py-3 pr-3 font-medium">{o.clients?.name ?? "—"}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{o.flavor ?? "—"}</td>
                  <td className="py-3 pr-3"><StatusBadge status={o.status} /></td>
                  <td className="py-3 pr-3"><StatusBadge status={o.payment_status} /></td>
                  <td className="py-3 text-right font-semibold">{formatBRL(o.value)}</td>
                </tr>
              ))}
              {!stats?.recent?.length && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum pedido ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone, onClick,
}: { icon: any; label: string; value: string; tone: "primary" | "success" | "warning" | "muted"; onClick?: () => void }) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    muted: "bg-muted text-foreground",
  }[tone];
  return (
    <button
      onClick={onClick}
      className="text-left bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${toneClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4 text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </button>
  );
}

function QuickLink({ icon: Icon, title, desc, onClick }: { icon: any; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
    >
      <Icon className="w-6 h-6 text-primary" />
      <div className="mt-3 font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}
