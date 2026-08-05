import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    // O Supabase processa o token do link (#access_token=...) automaticamente
    // e dispara o evento PASSWORD_RECOVERY quando a sessão está pronta.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPronto(true);
      }
    });

    // Caso a sessão já tenha sido processada antes do listener montar
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);

    if (error) {
      setErro("Não foi possível atualizar a senha. Tente pedir um novo link.");
      return;
    }

    setSucesso(true);
    setTimeout(() => navigate("/admin"), 1500);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-8 shadow-lg">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-red flex items-center justify-center text-white glow-red">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="font-display font-bold text-xl">Definir nova senha</h1>
        </div>

        {!pronto && !sucesso && (
          <p className="text-sm text-muted-foreground text-center">
            Verificando o link de redefinição...
          </p>
        )}

        {pronto && !sucesso && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmSenha">Confirmar senha</Label>
              <Input
                id="confirmSenha"
                type="password"
                value={confirmSenha}
                onChange={(e) => setConfirmSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button type="submit" disabled={enviando} className="mt-2">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
            </Button>
          </form>
        )}

        {sucesso && (
          <div className="flex flex-col items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            Senha atualizada. Redirecionando...
          </div>
        )}
      </div>
    </div>
  );
}
