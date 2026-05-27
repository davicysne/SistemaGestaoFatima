import { statusLabels } from "@/lib/format";

const styles: Record<string, string> = {
  agendado: "bg-primary/10 text-primary",
  em_producao: "bg-warning/20 text-warning-foreground",
  finalizado: "bg-success/15 text-success",
  entregue: "bg-success/15 text-success",
  cancelado: "bg-muted text-muted-foreground line-through",
  pago: "bg-success/15 text-success",
  pendente: "bg-warning/20 text-warning-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
