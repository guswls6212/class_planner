-- Phase B: 기존 4자 접속 코드 강제 만료
-- 실행 전 학원 운영자에게 새 코드 갱신 안내 필요.
-- 갱신 방법: 설정 > 학부모 접속 코드 > "전체 갱신" 버튼
UPDATE share_tokens
SET revoked_at = NOW()
WHERE LENGTH(access_code) = 4
  AND revoked_at IS NULL;
