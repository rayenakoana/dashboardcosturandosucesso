import { useState, useRef, useEffect, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, CheckCircle2, XCircle, Eye, EyeOff, User } from "lucide-react";

function Feedback({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div
      className={
        "flex items-center gap-2 text-sm rounded-lg px-3 py-2 " +
        (ok ? "text-green-600 bg-green-500/10" : "text-destructive bg-destructive/10")
      }
    >
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
      {msg}
    </div>
  );
}

export default function Perfil() {
  const { user } = useAuth();

  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url ?? null
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
    }
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarFeedback({ ok: false, msg: "Arquivo muito grande. Máximo 2 MB." });
      return;
    }
    const SAFE_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png":  "png",
      "image/webp": "webp",
    };
    if (!SAFE_EXT[file.type]) {
      setAvatarFeedback({ ok: false, msg: "Formato inválido. Use JPG, PNG ou WebP." });
      return;
    }

    setUploadingAvatar(true);
    setAvatarFeedback(null);
    // Extension derived from MIME type (not filename) to prevent path manipulation
    const ext = SAFE_EXT[file.type];
    const path = `avatars/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setAvatarFeedback({ ok: false, msg: "Erro ao fazer upload da foto." });
      setUploadingAvatar(false);
      return;
    }
    const { data } = supabase.storage.from("profiles").getPublicUrl(path);
    const publicUrl = data.publicUrl + "?t=" + Date.now();
    await supabase.auth.refreshSession();
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });
    if (updateError) {
      setAvatarFeedback({ ok: false, msg: "Foto salva, mas erro ao atualizar perfil." });
    } else {
      setAvatarUrl(publicUrl);
      try { localStorage.setItem("avatar_" + user.id, publicUrl); } catch {}
      setAvatarFeedback({ ok: true, msg: "Foto atualizada com sucesso." });
    }
    setUploadingAvatar(false);
  }

  const [nome, setNome] = useState<string>(user?.user_metadata?.full_name ?? "");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [nomeFeedback, setNomeFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSalvarNome(e: FormEvent) {
    e.preventDefault();
    setSalvandoNome(true);
    setNomeFeedback(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nome } });
    setSalvandoNome(false);
    setNomeFeedback(
      error
        ? { ok: false, msg: "Erro ao salvar nome." }
        : { ok: true, msg: "Nome atualizado com sucesso." }
    );
  }

  const [novoEmail, setNovoEmail] = useState<string>(user?.email ?? "");
  const [salvandoEmail, setSalvandoEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSalvarEmail(e: FormEvent) {
    e.preventDefault();
    setSalvandoEmail(true);
    setEmailFeedback(null);
    const { error } = await supabase.auth.updateUser({ email: novoEmail });
    setSalvandoEmail(false);
    setEmailFeedback(
      error
        ? { ok: false, msg: "Erro ao atualizar email." }
        : { ok: true, msg: "Confirmação enviada para o novo email." }
    );
  }

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [senhaFeedback, setSenhaFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSalvarSenha(e: FormEvent) {
    e.preventDefault();
    setSenhaFeedback(null);
    if (novaSenha !== confirmarSenha) {
      setSenhaFeedback({ ok: false, msg: "As senhas não coincidem." });
      return;
    }
    if (novaSenha.length < 8) {
      setSenhaFeedback({ ok: false, msg: "A senha deve ter pelo menos 8 caracteres." });
      return;
    }
    setSalvandoSenha(true);
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: senhaAtual,
    });
    if (reAuthError) {
      setSenhaFeedback({ ok: false, msg: "Senha atual incorreta." });
      setSalvandoSenha(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSalvandoSenha(false);
    if (error) {
      setSenhaFeedback({ ok: false, msg: "Erro ao atualizar senha." });
    } else {
      setSenhaFeedback({ ok: true, msg: "Senha atualizada com sucesso." });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    }
  }

  const cardClass =
    "rounded-xl border border-border/60 bg-card/40 backdrop-blur-xl p-6 flex flex-col gap-4";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl mb-1">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie suas informações de conta e segurança.
        </p>
      </div>

      <div className={cardClass}>
        <h2 className="text-sm font-semibold">Foto de perfil</h2>
        <div className="flex items-center gap-4">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl font-bold border-2 border-border">
                {user?.email?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploadingAvatar
                ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                : <Camera className="h-5 w-5 text-white" />}
            </button>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">JPG, PNG ou WebP, máximo 2 MB.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
            >
              <User className="h-3.5 w-3.5 mr-1.5" />
              Alterar foto
            </Button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
        {avatarFeedback && <Feedback {...avatarFeedback} />}
      </div>

      <div className={cardClass}>
        <h2 className="text-sm font-semibold">Nome de exibição</h2>
        <form onSubmit={handleSalvarNome} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          {nomeFeedback && <Feedback {...nomeFeedback} />}
          <Button type="submit" disabled={salvandoNome} className="self-start">
            {salvandoNome && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar nome
          </Button>
        </form>
      </div>

      <div className={cardClass}>
        <h2 className="text-sm font-semibold">Endereço de email</h2>
        <form onSubmit={handleSalvarEmail} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              required
            />
          </div>
          {emailFeedback && <Feedback {...emailFeedback} />}
          <Button type="submit" disabled={salvandoEmail} className="self-start">
            {salvandoEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar email
          </Button>
        </form>
      </div>

      <div className={cardClass}>
        <h2 className="text-sm font-semibold">Alterar senha</h2>
        <form onSubmit={handleSalvarSenha} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <div className="relative">
              <Input
                id="senha-atual"
                type={mostrarSenha ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input
              id="nova-senha"
              type={mostrarSenha ? "text" : "password"}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
            <Input
              id="confirmar-senha"
              type={mostrarSenha ? "text" : "password"}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita a nova senha"
              required
            />
          </div>
          {senhaFeedback && <Feedback {...senhaFeedback} />}
          <Button type="submit" disabled={salvandoSenha} className="self-start">
            {salvandoSenha && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Atualizar senha
          </Button>
        </form>
      </div>
    </div>
  );
}
