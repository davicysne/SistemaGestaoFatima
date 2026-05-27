import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatBRL, formatDateBR } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Fátima Tortas e Bolos" },
      { name: "description", content: "Entradas, pendências e movimentações financeiras." },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [searchPhone, setSearchPhone] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/", replace: true });
  }, [loading, isAdmin, navigate]);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);

  const { data: entries } = useQuery({
    enabled: isAdmin,
    queryKey: ["financeiro", from, to],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_date,
          order_time,
          value,
          payment_status,
          status,
          flavor,
          filling,
          notes,
          info,
          created_at,
          clients(name, phone)
        `)
        .gte("order_date", from)
        .lte("order_date", to)
        .order("order_date", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredEntries = useMemo(() => {
    const list = entries ?? [];
    const phone = searchPhone.replace(/\D/g, "");

    if (!phone) return list;

    return list.filter((e: any) => {
      const clientPhone = String(e.clients?.phone ?? "").replace(/\D/g, "");
      return clientPhone.includes(phone);
    });
  }, [entries, searchPhone]);

  const stats = useMemo(() => {
    const list = entries ?? [];

    const paid = list.filter((e: any) => e.payment_status === "pago");
    const pending = list.filter((e: any) => e.payment_status === "pendente");
    const paidToday = paid.filter((e: any) => e.order_date === todayStr);

    const sum = (rows: any[]) => rows.reduce((a, r) => a + Number(r.value || 0), 0);

    return {
      todayTotal: sum(paidToday),
      monthTotal: sum(paid),
      received: sum(paid),
      pendingTotal: sum(pending),
      finalized: sum(paid),
    };
  }, [entries, todayStr]);

  const exportCSV = () => {
    const rows = [
      ["Data", "Cliente", "Telefone", "Nº Pedido", "Status", "Valor"],
      ...(filteredEntries as any[]).map((e) => [
        formatDateBR(e.order_date),
        e.clients?.name ?? "",
        e.clients?.phone ?? "",
        `#${String(e.id).slice(0, 8)}`,
        e.payment_status,
        String(e.value).replace(".", ","),
      ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) return null;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Financeiro</p>
          <h1 className="font-serif text-3xl mt-1">Movimentações</h1>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1.5">
            <Label className="text-xs">Pesquisar por telefone</Label>
            <Input
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Ex: 85999999999"
              className="w-48"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>

          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" /> Exportar relatório
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Total do dia" value={formatBRL(stats.todayTotal)} sub={formatDateBR(todayStr)} />
        <Stat label="Total do mês" value={formatBRL(stats.monthTotal)} sub={`${formatDateBR(from)} – ${formatDateBR(to)}`} />
        <Stat label="Entradas recebidas" value={formatBRL(stats.received)} tone="success" />
        <Stat label="Pagamentos pendentes" value={formatBRL(stats.pendingTotal)} tone="primary" />
        <Stat label="Total finalizado" value={formatBRL(stats.finalized)} tone="success" />
      </section>

      <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 pb-3">
          <h2 className="font-semibold text-lg">Movimentações financeiras</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4">Data</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">Telefone</th>
                <th className="text-left py-3 px-4">Nº Pedido</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Valor</th>
              </tr>
            </thead>

            <tbody>
              {filteredEntries.map((e: any) => (
                <tr
                  key={e.id}
                  onClick={() => setSelectedOrder(e)}
                  className="border-t border-border cursor-pointer hover:bg-muted/40"
                >
                  <td className="py-3 px-4">{formatDateBR(e.order_date)}</td>
                  <td className="py-3 px-4 font-medium">{e.clients?.name ?? "—"}</td>
                  <td className="py-3 px-4">{e.clients?.phone ?? "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground">#{String(e.id).slice(0, 8)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={e.payment_status} />
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">{formatBRL(e.value)}</td>
                </tr>
              ))}

              {!filteredEntries.length && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma movimentação no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Pedido</p>
                <h2 className="font-serif text-2xl">#{String(selectedOrder.id).slice(0, 8)}</h2>
              </div>

              <button onClick={() => setSelectedOrder(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Cliente" value={selectedOrder.clients?.name} />
              <Info label="Telefone" value={selectedOrder.clients?.phone} />
              <Info label="Data" value={formatDateBR(selectedOrder.order_date)} />
              <Info label="Hora" value={String(selectedOrder.order_time ?? "").slice(0, 5)} />
              <Info label="Valor" value={formatBRL(selectedOrder.value)} />
              <Info label="Pagamento" value={selectedOrder.payment_status} />
              <Info label="Status produção" value={selectedOrder.status} />
              <Info label="Sabor" value={selectedOrder.flavor} />
              <Info label="Recheio" value={selectedOrder.filling} />
            </div>

            <div className="mt-4 space-y-3">
              <Info label="Informações" value={selectedOrder.info || selectedOrder.notes || "—"} />
            </div>

            <div className="flex justify-end mt-5">
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "primary";
}) {
  const valueColor = tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-foreground";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium mt-1">{value || "—"}</div>
    </div>
  );
}