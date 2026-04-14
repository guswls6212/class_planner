-- Migration: 020_create_invite_tokens.sql
-- Description: 초대 토큰 테이블 생성 (운영자 초대 기능)

CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role       TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_academy_id ON public.invite_tokens(academy_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.invite_tokens(token);

-- RLS 활성화
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: 해당 academy의 owner/admin만 조회 가능
CREATE POLICY "invite_tokens_select_by_academy_admins"
  ON public.invite_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = invite_tokens.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- INSERT: 해당 academy의 owner/admin만 생성 가능
CREATE POLICY "invite_tokens_insert_by_academy_admins"
  ON public.invite_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = invite_tokens.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- DELETE: 해당 academy의 owner/admin만 삭제 가능
CREATE POLICY "invite_tokens_delete_by_academy_admins"
  ON public.invite_tokens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = invite_tokens.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
