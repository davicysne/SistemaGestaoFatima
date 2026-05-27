import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Calendar, ChefHat, CheckCircle2, MoreVertical, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/producao")({
  head: () => ({
    meta: [
      { title: "Produção — Fátima Tortas e Bolos" },
      { name: "description", content: "Acompanhe o andamento da produção." },
    ],
  }),
  component: ProducaoPage,
});

type Order = {
  id: string;
  order_date: string;
  order_time: string;
  value: number;
  flavor: string | null;
  payment_status?: "pago" | "pendente";
  status: "agendado" | "em_producao" | "finalizado" | "entregue" | "cancelado";
  clients: { name: string; phone: string } | null;
};

const columns: { key: Order["status"]; label: string; icon: any; tone: string }[] = [
  { key: "agendado", label: "Agendamentos", icon: Calendar, tone: "bg-primary text-primary-foreground" },
  { key: "em_producao", label: "Em Produção", icon: ChefHat, tone: "bg-warning text-warning-foreground" },
  { key: "finalizado", label: "Finalizado", icon: CheckCircle2, tone: "bg-success text-success-foreground" },
];

function ProducaoPage() {
  const qc = useQueryClient();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const { data: orders } = useQuery({
    queryKey: ["producao", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_date, order_time, value, flavor, payment_status, status, clients(name, phone)")
        .eq("order_date", today)
        .in("status", ["agendado", "em_producao", "finalizado"])
        .order("order_time");

      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const onDrop = async (e: React.DragEvent, status: Order["status"]) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    const { error } = await supabase.from("orders").update({ status }).eq("id", id);

    if (error) toast.error(error.message);
    else {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["producao"] });
    }
  };

  const saveEdit = async () => {
    if (!editingOrder) return;

    const { error } = await supabase
      .from("orders")
      .update({
        order_date: editingOrder.order_date,
        order_time: editingOrder.order_time,
        value: editingOrder.value,
        flavor: editingOrder.flavor,
        payment_status: (editingOrder.payment_status ?? "pendente") as "pago" | "pendente",
        status: editingOrder.status,
      })
      .eq("id", editingOrder.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Pedido atualizado");
    setEditingOrder(null);
    qc.invalidateQueries({ queryKey: ["producao"] });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Produção</p>
        <h1 className="font-serif text-3xl mt-1">Acompanhamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Arraste os cartões para mudar o status. Mostrando apenas pedidos de hoje.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const items = (orders ?? []).filter((o) => o.status === col.key);
          const Icon = col.icon;

          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, col.key)}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm min-h-[400px]"
            >
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-4 font-semibold text-sm ${col.tone}`}>
                <Icon className="w-4 h-4" />
                {col.label}
                <span className="ml-auto text-xs opacity-80">{items.length}</span>
              </div>

              <div className="space-y-3">
                {items.map((o) => (
                  <article
                    key={o.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, o.id)}
                    className="bg-background border border-border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm">{o.clients?.name ?? "Cliente"}</div>
                        <div className="text-xs text-muted-foreground">{o.clients?.phone}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingOrder(o)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-muted-foreground mt-2">
                      {formatDateBR(o.order_date)} · {String(o.order_time).slice(0, 5)}
                    </div>

                    {o.flavor && <div className="text-sm mt-1">{o.flavor}</div>}

                    <div className="text-xs text-muted-foreground mt-1">
                      Pagamento: {o.payment_status ?? "pendente"}
                    </div>

                    <div className="text-sm font-semibold text-primary mt-2">
                      {formatBRL(o.value)}
                    </div>
                  </article>
                ))}

                {!items.length && (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    Nenhum pedido
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-md shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl">Editar pedido</h2>

              <button onClick={() => setEditingOrder(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Data</label>
                <input
                  type="date"
                  value={editingOrder.order_date}
                  onChange={(e) => setEditingOrder({ ...editingOrder, order_date: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Hora</label>
                <input
                  type="time"
                  value={String(editingOrder.order_time).slice(0, 5)}
                  onChange={(e) => setEditingOrder({ ...editingOrder, order_time: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Sabor</label>
                <input
                  value={editingOrder.flavor ?? ""}
                  onChange={(e) => setEditingOrder({ ...editingOrder, flavor: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Valor</label>
                <input
                  type="number"
                  value={editingOrder.value ?? 0}
                  onChange={(e) => setEditingOrder({ ...editingOrder, value: Number(e.target.value) })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Pagamento</label>
                <select
                  value={editingOrder.payment_status ?? "pendente"}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      payment_status: e.target.value as "pago" | "pendente",
                    })
                  }
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background"
                >
                  <option value="pendente">Pendente</option>
                  <option value="parcial">Parcial</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={editingOrder.status}
                  onChange={(e) =>
                    setEditingOrder({
                      ...editingOrder,
                      status: e.target.value as Order["status"],
                    })
                  }
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background"
                >
                  <option value="agendado">Agendado</option>
                  <option value="em_producao">Em produção</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 rounded-lg border border-border"
              >
                Cancelar
              </button>

              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}