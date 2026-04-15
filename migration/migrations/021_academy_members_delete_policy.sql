-- Migration: 021_academy_members_delete_policy.sql
-- Description: academy_members에 DELETE 정책 추가 (owner가 멤버 제거)

-- owner만 다른 멤버를 제거할 수 있다. 본인 제거는 API 레벨에서 차단.
CREATE POLICY "academy_members_delete_by_owner"
  ON public.academy_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = academy_members.academy_id
        AND am.user_id = auth.uid()
        AND am.role = 'owner'
    )
  );
