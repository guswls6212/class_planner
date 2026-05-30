-- Add invitee_label to invite_tokens for tracking admin invites.
-- per design-exploration team-invite-redesign Variant C (2026-05-23).
-- admin invite는 teacher row 없이도 발급되므로, settings 페이지에서 추적할
-- 식별자(별칭)를 컬럼으로 보관한다. member invite는 teacher row가 있으므로 NULL.

ALTER TABLE invite_tokens
  ADD COLUMN invitee_label TEXT NULL;

COMMENT ON COLUMN invite_tokens.invitee_label IS
  'Invitee 별칭 (admin invite 추적용). NULL 가능. 수락 시 가입자 실명으로 교체 가능.';
