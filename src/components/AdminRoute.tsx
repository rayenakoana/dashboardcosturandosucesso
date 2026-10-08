import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Guarda de rota para páginas exclusivas de administradores.
 *
 * Verifica `user.app_metadata.role === "admin"` no objeto de sessão local.
 * Esta verificação é feita sobre o JWT decodificado no browser e serve
 * APENAS para UX (ocultar a interface de não-admins).
 *
 * A autorização real e confiável está na Edge Function admin-criar-usuario,
 * que valida o JWT no servidor Supabase e verifica app_metadata.role lá.
 * Um JWT adulterado seria rejeitado pelo servidor mesmo que este guard
 * fosse contornado.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.app_metadata?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
