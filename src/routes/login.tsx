import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn, Lock, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoFatima from "@/assets/logoFatima.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Fátima Tortas e Bolos" },
      { name: "description", content: "Acesse o sistema de gestão da confeitaria." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await signIn(email.trim(), password);

    setSubmitting(false);

    if (error) {
      toast.error("Não foi possível entrar", { description: error });
      return;
    }

    toast.success("Bem-vinda(o) de volta!");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-gradient-to-br from-accent/40 via-background to-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <img
              src={logoFatima}
              alt="Logo Fátima Tortas e Bolos"
              className="w-24 h-24 object-contain rounded-2xl mb-4"
            />

            <h1 className="font-serif text-3xl text-foreground">Fátima</h1>
            <p className="text-sm tracking-widest uppercase text-muted-foreground">
              Tortas e Bolos
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Acesse sua conta para gerenciar pedidos.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Login</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Mostrar senha"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={submitting}>
              <LogIn className="w-4 h-4 mr-2" />
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-xs text-center text-muted-foreground">
            Acesso restrito. Usuários são cadastrados pela equipe.
          </p>
        </div>
      </div>
    </div>
  );
}