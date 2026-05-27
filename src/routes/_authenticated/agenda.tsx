import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateBR } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Fátima Tortas e Bolos" },
      { name: "description", content: "Calendário mensal de pedidos." },
    ],
  }),
  component: AgendaPage,
});

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DOWS = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

function AgendaPage() {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const { data: orders } = useQuery({
    queryKey: ["agenda", monthStart.toISOString().slice(0,10)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_date, order_time, value, flavor, status, payment_status, clients(name, phone)")
        .gte("order_date", monthStart.toISOString().slice(0,10))
        .lte("order_date", monthEnd.toISOString().slice(0,10))
        .order("order_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    (orders ?? []).forEach((o: any) => {
      const arr = map.get(o.order_date) ?? [];
      arr.push(o);
      map.set(o.order_date, arr);
    });
    return map;
  }, [orders]);

  const days: Array<{ date: Date; current: boolean }> = [];
  const firstDow = monthStart.getDay();
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = new Date(monthStart); d.setDate(d.getDate() - i - 1);
    days.push({ date: d, current: false });
  }
  for (let d = 1; d <= monthEnd.getDate(); d++) {
    days.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), current: true });
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const n = new Date(last); n.setDate(n.getDate() + 1);
    days.push({ date: n, current: false });
  }

  const filtered = (orders ?? []).filter((o: any) =>
    !search || o.clients?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const todayStr = new Date().toISOString().slice(0,10);

  const onDelete = async (id: string) => {
    if (!confirm("Excluir este pedido?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Pedido excluído"); setEditing(null); qc.invalidateQueries(); }
  };

  const onSave = async () => {
    if (!editing) return;
    const { error } = await supabase.from("orders").update({
      order_date: editing.order_date,
      order_time: editing.order_time,
      status: editing.status,
      payment_status: editing.payment_status,
      value: Number(String(editing.value).replace(",", ".")) || 0,
    }).eq("id", editing.id);
    if (error) toast.error(error.message);
    else { toast.success("Pedido atualizado"); setEditing(null); qc.invalidateQueries(); }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Agenda</p>
        <h1 className="font-serif text-3xl mt-1">Todos os agendamentos do mês</h1>
      </header>

      <section className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="font-semibold text-lg min-w-[180px] text-center">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </div>
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Pesquisar nome" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1">
          {DOWS.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ date, current }, idx) => {
            const key = date.toISOString().slice(0,10);
            const dayOrders = byDay.get(key) ?? [];
            const isToday = key === todayStr;
            return (
              <button
                key={idx}
                onClick={() => dayOrders[0] && setEditing(dayOrders[0])}
                className={`relative aspect-square rounded-lg border text-sm flex flex-col items-center justify-center transition-colors ${
                  current ? "border-border bg-background hover:border-primary/40" : "border-transparent text-muted-foreground/50"
                } ${isToday ? "!bg-primary !text-primary-foreground !border-primary" : ""}`}
              >
                <span>{date.getDate()}</span>
                {dayOrders.length > 0 && (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {dayOrders.slice(0, 3).map((o: any) => (
                      <span key={o.id} className={`w-1.5 h-1.5 rounded-full ${o.payment_status === "pago" ? "bg-success" : "bg-primary"}`} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 text-xs mt-4 text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> Pago</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Pendente</span>
        </div>
      </section>

      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4">Data / Hora</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">Sabor</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Pagamento</th>
                <th className="text-right py-3 px-4">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o: any) => (
                <tr key={o.id} className="border-t border-border hover:bg-accent/30 cursor-pointer" onClick={() => setEditing(o)}>
                  <td className="py-3 px-4">{formatDateBR(o.order_date)} · {String(o.order_time).slice(0,5)}</td>
                  <td className="py-3 px-4 font-medium">{o.clients?.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{o.flavor ?? "—"}</td>
                  <td className="py-3 px-4"><StatusBadge status={o.status} /></td>
                  <td className="py-3 px-4"><StatusBadge status={o.payment_status} /></td>
                  <td className="py-3 px-4 text-right font-semibold">{formatBRL(o.value)}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum agendamento neste mês.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar pedido — {editing?.clients?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={editing.order_date} onChange={(e) => setEditing({ ...editing, order_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora</Label>
                <Input type="time" value={String(editing.order_time).slice(0,5)} onChange={(e) => setEditing({ ...editing, order_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Pagamento</Label>
                <Select value={editing.payment_status} onValueChange={(v) => setEditing({ ...editing, payment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="em_producao">Em Produção</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => editing && onDelete(editing.id)}>
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
            <Button onClick={onSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
