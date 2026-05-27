import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Clock,
  Phone,
  User,
  Calendar as CalIcon,
  Printer,
  Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/comandas")({
  head: () => ({
    meta: [
      { title: "Nova Comanda — Fátima Tortas e Bolos" },
      { name: "description", content: "Crie um novo pedido de bolo." },
    ],
  }),
  component: ComandaPage,
});

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const formatMoney = (raw: string) => {
  const onlyNumbers = raw.replace(/\D/g, "");
  const numericValue = Number(onlyNumbers) / 100;

  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const moneyToNumber = (money: string) => {
  const onlyNumbers = money.replace(/\D/g, "");
  return Number(onlyNumbers) / 100;
};

const formatDateBR = (date: string) => {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

function ComandaPage() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();

  const today = new Date().toISOString().slice(0, 10);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("14:00");
  const [value, setValue] = useState("R$ 0,00");
  const [info, setInfo] = useState("");
  const [flavor, setFlavor] = useState("");
  const [filling, setFilling] = useState("");
  const [status, setStatus] = useState("agendado");
  const [payment, setPayment] = useState("pendente");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lookupClient = async (rawPhone: string) => {
    const p = onlyDigits(rawPhone);

    if (p.length < 8) return;

    const { data } = await supabase
      .from("clients")
      .select("name, notes")
      .eq("phone", p)
      .maybeSingle();

    if (data) {
      setName(data.name);

      if (data.notes && !info) setInfo(data.notes);

      toast.success("Cliente encontrado", {
        description: data.name,
      });
    }
  };

  const onImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];

    if (!f) return;

    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setPhone("");
    setName("");
    setDate(today);
    setTime("14:00");
    setValue("R$ 0,00");
    setInfo("");
    setFlavor("");
    setFilling("");
    setStatus("agendado");
    setPayment("pendente");
    setImageFile(null);
    setImagePreview(null);
  };

  const printReceipt = () => {
    const receiptWindow = window.open("", "_blank", "width=800,height=900");

    if (!receiptWindow) {
      toast.error("Não foi possível abrir a janela de impressão.");
      return;
    }

    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Recibo Não Fiscal</title>
          <style>
            * {
              box-sizing: border-box;
              font-family: Arial, sans-serif;
            }

            body {
              margin: 0;
              padding: 24px;
              color: #222;
              background: #fff;
            }

            .receipt {
              max-width: 720px;
              margin: 0 auto;
              border: 1px solid #ddd;
              border-radius: 12px;
              padding: 28px;
            }

            .header {
              text-align: center;
              border-bottom: 1px solid #ddd;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }

            .header h1 {
              margin: 0;
              font-size: 24px;
            }

            .header p {
              margin: 6px 0 0;
              font-size: 13px;
              color: #666;
            }

            .notice {
              margin-top: 10px;
              font-size: 13px;
              font-weight: bold;
              color: #444;
            }

            .section {
              margin-top: 20px;
            }

            .section h2 {
              font-size: 16px;
              margin-bottom: 10px;
              border-bottom: 1px solid #eee;
              padding-bottom: 6px;
            }

            .row {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 6px 0;
              font-size: 14px;
            }

            .label {
              font-weight: bold;
              color: #444;
            }

            .value {
              text-align: right;
            }

            .description {
              white-space: pre-wrap;
              line-height: 1.5;
              font-size: 14px;
              border: 1px solid #eee;
              border-radius: 8px;
              padding: 12px;
              min-height: 70px;
            }

            .total {
              margin-top: 24px;
              padding: 16px;
              background: #f7f7f7;
              border-radius: 10px;
              display: flex;
              justify-content: space-between;
              font-size: 20px;
              font-weight: bold;
            }

            .footer {
              margin-top: 32px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }

            .signature {
              margin-top: 48px;
              display: flex;
              justify-content: space-between;
              gap: 32px;
            }

            .signature div {
              flex: 1;
              text-align: center;
              border-top: 1px solid #333;
              padding-top: 8px;
              font-size: 13px;
            }

            @media print {
              body {
                padding: 0;
              }

              .receipt {
                border: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="receipt">
            <div class="header">
              <h1>Fátima Tortas e Bolos</h1>
              <p>Recibo de pedido</p>
              <div class="notice">RECIBO NÃO FISCAL</div>
            </div>

            <div class="section">
              <h2>Dados do recibo</h2>
              <div class="row">
                <span class="label">Número do recibo:</span>
                <span class="value">${receiptNumber}</span>
              </div>
              <div class="row">
                <span class="label">Data de emissão:</span>
                <span class="value">${new Date().toLocaleDateString("pt-BR")}</span>
              </div>
            </div>

            <div class="section">
              <h2>Cliente</h2>
              <div class="row">
                <span class="label">Nome:</span>
                <span class="value">${name || "-"}</span>
              </div>
              <div class="row">
                <span class="label">Telefone:</span>
                <span class="value">${phone || "-"}</span>
              </div>
            </div>

            <div class="section">
              <h2>Pedido</h2>
              <div class="row">
                <span class="label">Data agendada:</span>
                <span class="value">${formatDateBR(date)}</span>
              </div>
              <div class="row">
                <span class="label">Hora:</span>
                <span class="value">${time}</span>
              </div>
              <div class="row">
                <span class="label">Sabor:</span>
                <span class="value">${flavor || "-"}</span>
              </div>
              <div class="row">
                <span class="label">Recheio:</span>
                <span class="value">${filling || "-"}</span>
              </div>
              <div class="row">
                <span class="label">Status do pedido:</span>
                <span class="value">${status}</span>
              </div>
              <div class="row">
                <span class="label">Pagamento:</span>
                <span class="value">${payment}</span>
              </div>
            </div>

            <div class="section">
              <h2>Informações adicionais</h2>
              <div class="description">${info || "Nenhuma observação informada."}</div>
            </div>

            <div class="total">
              <span>Valor total</span>
              <span>${value}</span>
            </div>

            <div class="signature">
              <div>Assinatura do cliente</div>
              <div>Responsável pelo pedido</div>
            </div>

            <div class="footer">
              Este documento não possui valor fiscal. Recibo emitido apenas para controle do pedido.
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error("Apenas administradores podem criar comandas.");
      return;
    }

    if (!name.trim() || !phone.trim()) {
      toast.error("Informe nome e telefone.");
      return;
    }

    setSaving(true);

    try {
      const phoneClean = onlyDigits(phone);

      const { data: client, error: cErr } = await supabase
        .from("clients")
        .upsert(
          {
            phone: phoneClean,
            name: name.trim(),
            notes: info || null,
          },
          {
            onConflict: "phone",
          },
        )
        .select("id")
        .single();

      if (cErr) throw cErr;

      let image_url: string | null = null;

      if (imageFile) {
        const path = `${client.id}/${Date.now()}-${imageFile.name}`;

        const up = await supabase.storage
          .from("cake-images")
          .upload(path, imageFile, {
            upsert: true,
          });

        if (up.error) throw up.error;

        const { data: pub } = supabase.storage
          .from("cake-images")
          .getPublicUrl(path);

        image_url = pub.publicUrl;
      }

      const { error: oErr } = await supabase.from("orders").insert({
        client_id: client.id,
        vendor_id: user?.id ?? null,
        order_date: date,
        order_time: time,
        value: moneyToNumber(value),
        info: info || null,
        flavor: flavor || null,
        filling: filling || null,
        image_url,
        status: status as any,
        payment_status: payment as any,
      });

      if (oErr) throw oErr;

      toast.success("Comanda criada!");
      qc.invalidateQueries();
      reset();
    } catch (err: any) {
      toast.error("Erro ao salvar", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Comandas
        </p>
        <h1 className="font-serif text-3xl mt-1">Nova Comanda de Bolo</h1>
      </header>

      <form
        onSubmit={onSubmit}
        className="bg-card border border-border rounded-2xl shadow-sm p-6 md:p-8 space-y-5"
      >
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-1">
            <Label>Telefone</Label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => lookupClient(phone)}
                placeholder="(21) 99999-9999"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Cliente</Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do cliente"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Data</Label>
            <div className="relative">
              <CalIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Hora</Label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Valor</Label>
            <Input
              value={value}
              onChange={(e) => setValue(formatMoney(e.target.value))}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Sabor</Label>
            <Input
              value={flavor}
              onChange={(e) => setFlavor(e.target.value)}
              placeholder="Ex: Chocolate com morango"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Recheio</Label>
            <Input
              value={filling}
              onChange={(e) => setFilling(e.target.value)}
              placeholder="Ex: Brigadeiro"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Informações</Label>
          <Textarea
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Detalhes adicionais do pedido, observações, decoração, etc."
            rows={4}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Status do pedido</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Pagamento</Label>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* <div className="space-y-1.5"> */}
            {/* <Label>Modelo do bolo</Label> */}
            {/* <label className="flex items-center justify-center h-10 rounded-md border border-dashed border-border cursor-pointer text-sm text-muted-foreground hover:bg-accent/40 transition"> */}
              {/* <Camera className="w-4 h-4 mr-2" /> */}
              {/* {imageFile ? imageFile.name.slice(0, 24) : "Enviar imagem"} */}
              {/* <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onImage}
              /> */}
            {/* </label> */}
          {/* </div> */}
        </div>

        {imagePreview && (
          <div className="rounded-xl overflow-hidden border border-border w-40">
            <img
              src={imagePreview}
              alt="Pré-visualização"
              className="w-full h-40 object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={printReceipt}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir recibo
          </Button>

          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar comanda"}
          </Button>
        </div>
      </form>
    </div>
  );
}