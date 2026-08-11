import { useRef, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Camera } from "lucide-react";
import { toast } from "sonner";
import { useSDRs, useAddSDR, useUpdateSDR, useUploadFotoSDR, SDR } from "@/hooks/useSDRs";

function initials(nome: string) {
  return nome.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function SDRRow({ sdr }: { sdr: SDR }) {
  const updateMutation = useUpdateSDR();
  const uploadMutation = useUploadFotoSDR();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState(sdr.nome);
  const [rdUserId, setRdUserId] = useState(sdr.rd_user_id || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate({ id: sdr.id, file }, {
      onSuccess: () => toast.success("Foto atualizada"),
      onError: () => toast.error("Erro ao enviar foto"),
    });
  };

  const handleNomeBlur = () => {
    const v = nome.trim();
    if (v && v !== sdr.nome) {
      updateMutation.mutate({ id: sdr.id, nome: v }, { onSuccess: () => toast.success("Nome atualizado") });
    }
  };

  const handleRdUserIdBlur = () => {
    const v = rdUserId.trim();
    if (v !== (sdr.rd_user_id || "")) {
      updateMutation.mutate({ id: sdr.id, rd_user_id: v || null }, { onSuccess: () => toast.success("Vínculo RD Station atualizado") });
    }
  };

  const handleToggleAtivo = () => {
    updateMutation.mutate({ id: sdr.id, ativo: !sdr.ativo }, {
      onSuccess: () => toast.success(!sdr.ativo ? "SDR ativado" : "SDR desativado"),
    });
  };

  return (
    <div className="flex items-center gap-4 py-3 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors flex-wrap sm:flex-nowrap">
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center text-sm font-semibold text-muted-foreground">
          {sdr.foto_url ? <img src={sdr.foto_url} alt={sdr.nome} className="w-full h-full object-cover" /> : initials(sdr.nome)}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background"
          disabled={uploadMutation.isPending}
        >
          <Camera className="h-2.5 w-2.5 text-primary-foreground" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="flex-1 min-w-[160px]">
        <Input
          value={nome}
          onChange={e => setNome(e.target.value)}
          onBlur={handleNomeBlur}
          className="bg-transparent border-0 border-b border-transparent focus-visible:border-primary rounded-none px-0 h-auto py-1 text-base font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">RD Station:</span>
          <Input
            value={rdUserId}
            onChange={e => setRdUserId(e.target.value)}
            onBlur={handleRdUserIdBlur}
            placeholder="user_id do responsável"
            className="h-6 text-xs bg-muted/50 border-border px-2 py-0 max-w-[220px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-muted-foreground w-12 text-center">{sdr.ativo ? "Ativo" : "Inativo"}</span>
        <Switch checked={sdr.ativo} onCheckedChange={handleToggleAtivo} disabled={updateMutation.isPending} />
      </div>
    </div>
  );
}

export function SDRsConfigSection() {
  const { data: sdrs = [], isLoading } = useSDRs();
  const addMutation = useAddSDR();
  const [novoNome, setNovoNome] = useState("");

  const handleAdd = () => {
    const v = novoNome.trim();
    if (!v) return;
    addMutation.mutate({ nome: v }, {
      onSuccess: () => { setNovoNome(""); toast.success("SDR adicionado"); },
      onError: () => toast.error("Erro ao adicionar SDR"),
    });
  };

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Equipe de SDR</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Cadastre a foto, o nome e vincule cada SDR ao <code className="text-[11px]">user_id</code> responsável no RD Station.
        Desative em vez de excluir para manter o histórico de métricas.
      </p>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Nome do novo SDR..."
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="bg-muted/50 border-border"
        />
        <Button onClick={handleAdd} disabled={addMutation.isPending} className="gap-1 bg-primary hover:bg-primary/90 shrink-0">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : sdrs.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum SDR cadastrado</p>
      ) : (
        <div className="space-y-1.5">
          {sdrs.map(sdr => <SDRRow key={sdr.id} sdr={sdr} />)}
        </div>
      )}
    </GlassCard>
  );
}
