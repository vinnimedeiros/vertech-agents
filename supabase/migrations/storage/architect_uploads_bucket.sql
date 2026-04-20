-- =============================================================================
-- Bucket architect-uploads (Phase 08-alpha, story 08A.4)
-- =============================================================================
-- Armazena arquivos uploadados pelo usuário durante sessão do Arquiteto.
-- Após publish (architectTools.publishAgentFromSession, story 08A.3), os
-- documentos permanecem no bucket mas passam a pertencer ao agente via
-- knowledge_document.agentId (sessionId fica null).
--
-- Path pattern (endpoint 08A.4 força): {orgId}/{sessionId-or-agentId}/{docId}/{filename}
--
-- **Privacidade e auth:**
-- O projeto usa better-auth (não Supabase Auth), portanto `auth.uid()` é null
-- em queries vindas do browser. Todo acesso legítimo ao Storage acontece via
-- endpoint server-side (apps/web/app/api/architect/upload) com chave
-- SERVICE_ROLE e validação explícita de `requireOrgAccess` + ownership da
-- sessão. Policies RLS aqui servem como **default deny** para bloquear
-- acessos ad-hoc via JWT de outros contextos (ex: Supabase Dashboard SQL
-- Editor rodando como user comum).
-- =============================================================================

-- Idempotente: safe pra re-execução.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'architect-uploads',
  'architect-uploads',
  false,
  10485760, -- 10 MB por arquivo
  ARRAY[
    -- Documentos estruturados suportados pelos extractors (08A.1)
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    -- Imagens pra preview (não são indexadas no RAG, mas podem ser anexadas)
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- Policies em storage.objects escopadas ao bucket architect-uploads.
-- =============================================================================
-- Estratégia: default deny pra não-service_role. Acesso legítimo é via
-- endpoint server-side. Policies aqui são defesa em profundidade.
-- =============================================================================

-- Drop de policies antigas (caso já existam de tentativa anterior)
DROP POLICY IF EXISTS "architect_uploads_deny_anon" ON storage.objects;
DROP POLICY IF EXISTS "architect_uploads_deny_authenticated" ON storage.objects;

-- Bloqueia SELECT/INSERT/UPDATE/DELETE pra role anon em architect-uploads.
-- service_role ignora RLS por design.
CREATE POLICY "architect_uploads_deny_anon" ON storage.objects
FOR ALL TO anon
USING (bucket_id <> 'architect-uploads')
WITH CHECK (bucket_id <> 'architect-uploads');

-- Bloqueia também o role authenticated (better-auth não seta JWT do Supabase,
-- mas outros contextos podem). Service_role permanece livre.
CREATE POLICY "architect_uploads_deny_authenticated" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id <> 'architect-uploads')
WITH CHECK (bucket_id <> 'architect-uploads');
