import { useState, FormEvent } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (user) return <Navigate to="/admin/comercial" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await signIn(email, senha);
    setEnviando(false);
    if (error) {
      setErro("Email ou senha incorretos.");
      return;
    }
    navigate("/admin/comercial");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            "radial-gradient(ellipse 60% 40% at 15% 10%, hsl(355 82% 51% / 0.18), transparent 60%)",
            "radial-gradient(ellipse 50% 35% at 85% 85%, hsl(355 82% 51% / 0.10), transparent 60%)",
            "radial-gradient(ellipse 40% 30% at 50% 50%, hsl(240 22% 12% / 0.6), transparent 70%)",
          ].join(", "),
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center text-white glow-red"
            style={{ backgroundImage: "var(--gradient-red)" }}
          >
            <Lock className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="font-display font-bold text-2xl tracking-wide">
              CS<span className="text-gradient"> Dash</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Costurando Sucesso — Área Administrativa
            </p>
          </div>
        </div>
        <div
          className="rounded-2xl border backdrop-blur-xl p-8 shadow-2xl"
          style={{
            background: "hsl(var(--card) / 0.65)",
            borderColor: "hsl(var(--border))",
            boxShadow: "0 0 0 1px hsl(0 0% 100% / 0.04) inset, 0 24px 48px hsl(240 22% 4% / 0.5)",
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link
                  to="/reset-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {erro && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}
            <Button
              type="submit"
              disabled={enviando}
              className="mt-1 h-10 w-full btn-primary-red"
            >
              {enviando ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando…
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso restrito à equipe Costurando Sucesso
        </p>
      </div>
    </div>
  );
}
