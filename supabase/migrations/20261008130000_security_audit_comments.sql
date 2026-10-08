-- Migração: documentação do modelo de segurança (auditoria — sem alterações de schema)
--
-- Registra formalmente as decisões de acesso para referência futura.
-- Nenhuma tabela, policy ou grant é alterada aqui.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ MODELO DE ACESSO ATUAL                                                   │
-- ├──────────────────────────────────────────────────────────────────────────┤
-- │ rls_allow_all() retorna true para TODOS os roles, incluindo anon.        │
-- │ Isso é intencional: as rotas /funil-xpto, /marketing e /mapa não         │
-- │ requerem autenticação no frontend. O Supabase anon key é usado para      │
-- │ leitura pública nessas páginas.                                          │
-- │                                                                          │
-- │ RISCO ACEITO: qualquer pessoa com acesso à URL do projeto Supabase       │
-- │ pode ler (SELECT) as tabelas de dashboard via API REST com a anon key.   │
-- │ Se confidencialidade dos dados comerciais for necessária, substituir     │
-- │ rls_allow_all() por policies que exijam auth.uid() IS NOT NULL.          │
-- │                                                                          │
-- │ Tabelas afetadas (SELECT/INSERT/UPDATE/DELETE abertos ao anon):          │
-- │   vendas, configuracoes, custos_marketing, performance_reunioes,         │
-- │   metricas_diarias, sdrs, deals_sdr_tracking, tasks_sdr_tracking        │
-- ├──────────────────────────────────────────────────────────────────────────┤
-- │ ai_usage_log: SEGURA — RLS ativo, sem policies para anon/authenticated.  │
-- │ Acesso exclusivo via service_role (SECURITY DEFINER em                   │
-- │ check_and_log_ai_call). REVOKE aplicado na migração anterior.            │
-- ├──────────────────────────────────────────────────────────────────────────┤
-- │ check_and_log_ai_call: SEGURA — EXECUTE revocado de PUBLIC, authenticated│
-- │ e anon. Somente service_role pode chamar. Sem acesso via REST API por    │
-- │ usuários comuns.                                                         │
-- └──────────────────────────────────────────────────────────────────────────┘

-- Confirma que ai_usage_log não tem policies permissivas (assertion documental).
-- Se esta query retornar linhas, há uma policy não esperada — revisar.
DO $$
DECLARE
  v_unexpected_policies int;
BEGIN
  SELECT COUNT(*)
    INTO v_unexpected_policies
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'ai_usage_log'
     AND (roles @> ARRAY['anon']::name[]
          OR roles @> ARRAY['authenticated']::name[]
          OR roles = ARRAY[]::name[]);  -- policy sem roles explícitas aplica a todos

  IF v_unexpected_policies > 0 THEN
    RAISE WARNING
      'AUDITORIA: ai_usage_log tem % policy(ies) que podem conceder acesso a anon ou authenticated. Revisar.',
      v_unexpected_policies;
  END IF;
END $$;

COMMENT ON TABLE ai_usage_log IS
  'Registro de chamadas IA por usuário. Acesso exclusivo ao service_role via SECURITY DEFINER. Sem acesso anon/authenticated.';

COMMENT ON FUNCTION check_and_log_ai_call(uuid, text, int, int) IS
  'Verifica e registra chamada de IA. EXECUTE restrito ao service_role. Usado pela Edge Function claude-proxy.';
