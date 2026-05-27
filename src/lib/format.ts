export const formatBRL = (value: number | string | null | undefined) => {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
};

export const formatDateBR = (date: string | Date) => {
  const d = typeof date === "string" ? new Date(date + (date.length === 10 ? "T00:00:00" : "")) : date;
  return d.toLocaleDateString("pt-BR");
};

export const statusLabels: Record<string, string> = {
  agendado: "Agendado",
  em_producao: "Em Produção",
  finalizado: "Finalizado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  pago: "Pago",
  pendente: "Pendente",
};

export const roleLabels: Record<string, string> = {
  admin: "Admin",
  confeiteiro: "Confeiteiro",
  boleiro: "Boleiro",
  caixa: "Caixa",
};
