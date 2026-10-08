import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna o header Authorization com o token da sessão Supabase ativa.
 * Lança erro se não houver sessão — usado em contextos que já garantem
 * que o usuário está autenticado (páginas protegidas por ProtectedRoute
 * ou componentes só exibidos para usuários logados).
 */
export async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}
