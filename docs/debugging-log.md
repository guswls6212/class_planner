# class-planner 디버깅 저널

> AI 세션 간 맥락을 유지하기 위한 로그. 새 세션 시작 시 이 파일을 먼저 읽어야 한다.
> 포맷: 날짜 역순 (최신이 맨 위). 각 항목은 "무슨 현상 → 원인 → 조치 → 결과" 구조.

---

## 현재 열린 이슈

### [OPEN] DRAG-001 — 드래그 후 세션이 실제로 이동하지 않음

**현상:**
- 세션 블록을 다른 요일/시간으로 드래그하면 미리보기는 보이지만, 드롭 후 데이터가 업데이트되지 않고 원 위치로 "복귀"
- opacity:0.4로 남은 채 dragend가 발화되지 않는 경우도 있음
- 새로고침 시 localStorage 데이터가 서버 GET으로 덮여 최근 세션이 사라짐

**확증된 근본 원인:**
Chrome native drag engine은 드래그 중 소스 요소의 `pointer-events`가 `auto → none`으로 바뀌면 드래그를 즉시 취소한다. Playwright 합성 DragEvent는 이 동작을 재현하지 못함 — 실제 마우스 드래그에서만 발현.

**시도한 접근 및 결과:**

| Phase | 브랜치 | PR | 내용 | 결과 |
|-------|--------|-----|------|------|
| D | fix/drag-ux-phase-d | #90 | lane 1만 드래그, z-index 역전, pixel/logical yPosition 불일치 수정 | ✅ dev 머지 |
| E | fix/drag-preview-phase-e | #91 | Bug4(드래그 중 다른 블록 사라짐) z-index 수정. pointer-events:none 시도 → 회귀 | ❌ revert |
| F | fix/drag-init-regression-phase-f | #92 | pointer-events revert. z-index 픽스만 유지 | ✅ dev 머지 |
| G | fix/drag-preview-drop-phase-g | #93 | hasDragTarget 조건부 pointer-events. Playwright 통과, 실제 마우스 실패 | ❌ revert |
| G-revert | hotfix/revert-drag-phase-g | #94 | PR #93 전면 revert | ✅ dev 머지 (2026-04-24) |

**현재 상태 (2026-04-24):**
- dev = Phase F 수준. 드래그 기본 동작은 정상이나 드롭 데이터 업데이트가 여전히 미완.
- "같은 자리에 놓으면 이동 안 됨" 제약이 남아있음.
- Playwright 합성 이벤트가 Chrome native drag를 재현 못하므로, 실제 마우스 로그 캡처 인프라 없이는 재시도가 위험.

**미결 질문:**
1. 드롭 이벤트가 TimeTableCell에 도달하는지 여부를 실제 마우스 드래그 시 로그로 확인 필요.
2. `computeTentativeLayout`이 만든 미리보기 블록이 drop을 가로채는지 확인 필요.

**다음 단계:**
→ Phase H (ghost-div 재설계) 착수 전에 omni-radar + Chrome 확장으로 실제 드래그 로그 확보.
→ `docs/debugging-guide.md` 참고.

---

### [OPEN] DATA-001 — 새로고침 시 서버 데이터가 localStorage를 덮어씀

**현상:**
드래그 후 새로고침하면 직전에 만들거나 이동한 세션이 사라짐.

**원인 (DRAG-001과 연동):**
1. Chrome이 드래그를 취소 → dragend 미발화 → dragPreview 상태가 갇힘
2. 그 상태에서 새로고침 → 서버 GET → localStorage 덮어씀
   - `localStorageCrud - 데이터 저장 성공` 직후 `서버 데이터 조회 완료` 순서 확인됨

**판단:** DRAG-001이 해결되면 B도 해소될 가능성 높음. 별도 픽스 불필요.

---

## 완료된 이슈

### [DONE] DRAG-000 — 드래그 UX 초기 구현 (Phase A-D)

- Phase A: HTML5 drag-and-drop 기본 구현
- Phase B: B2(세로 시간축), B3(D-hybrid overflow)
- Phase C: computeTentativeLayout 미리보기
- Phase D: Bug 1~3 수정 (lane 1만 드래그, z-index, pixel/logical 불일치)

---

## 디버깅 세션 기록

### 2026-04-24 (2차 — omni-radar localStorage 후킹 구현)

**배경:** DRAG-001 재시도 전에 실제 마우스 로그 캡처 인프라 구축. 특히 Local-first 아키텍처에서 `localStorage` 읽기/쓰기 흐름을 볼 수 없던 게 드래그 원인 분석의 최대 blind spot이었음.

**구현한 것 (omni-radar repo):**

1. `radar_console_hook.js` — Storage 후킹 블록 추가 (XMLHttpRequest 섹션 직전)
   - `hookStorage(storage, storageType)` — setItem/getItem/removeItem/clear 래핑
   - 이벤트 타입: `storage`
   - payload: `{ storage: "local"|"session", op: "write"|"read"|"delete"|"clear", key, value_preview, value_length, url }`
   - read 캡처 기본 활성, `window.__OMNI_RADAR_STORAGE_READ_CAPTURE__ = false`로 비활성화
   - value_preview 500자 truncate
   - SecurityError try/catch (sandboxed iframe 대응)

2. `frontend/src/constants/severity.ts` — `case "storage": return "browser"` 추가 (카테고리 매핑)

3. `ARCHITECTURE.md` — Browser Observability Events 섹션에 storage 이벤트 설명 추가

**검증:**
- Python 테스트 127 pass ✓
- 프론트엔드 build 통과 ✓
- JS 문법 `node -c` 통과 ✓

**커밋 상태:**
omni-radar repo는 pre-existing dirty 58개 파일이 있어서 내 변경분만 격리 커밋이 어려움. 파일 수정 상태로만 남겨둠. 다음 omni-radar 정리 세션 때 batch buffer 개선 + storage 후킹을 함께 커밋 권장.

**그레프 명령어 (읽기용):**
```bash
# localStorage 변경 전체
grep '"event_type":"storage"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl

# classPlannerData 키만 (드래그 관련)
grep '"event_type":"storage"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl \
  | grep "classPlannerData"
```

---

### 2026-04-24 (1차 — 컨텍스트 압축 복원)

**진행한 것:**
- Phase G 구현 → Playwright 합성 이벤트로 검증 → 실제 마우스 테스트 실패
- 실패 원인: Chrome native drag + pointer-events:none = 드래그 즉시 취소
- PR #93 전면 revert → PR #94 생성 → CI SUCCESS → dev 머지 완료
- TASKS.md에 Phase H/I 백로그 등록
- omni-radar + Chrome 확장 경로 발견 (logger.ts → console.log 후킹으로 zero-code 가능)

**세션 종료 상태:**
- dev 브랜치: PR #94 머지 완료 (Phase F 수준)
- 열린 이슈: DRAG-001, DATA-001
- 대기 결정: Phase H 착수 시점, Phase I 구현 방식

**다음 세션 시작 전 확인 사항:**
1. `git log --oneline dev -3` — dev 최신 상태 확인
2. `docs/debugging-guide.md` — omni-radar 설정 상태 확인
3. 이 파일(debugging-log.md) 상단 "현재 열린 이슈" 섹션 읽기

---

## 로그 읽기 Quick Reference

omni-radar 서버 실행 중일 때:

```bash
# 드래그 관련 전체 로그
grep '"event_type":"console_log"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl \
  | grep -i "drag" | jq '.message // .'

# drop 이벤트 도달 여부 확인 (핵심)
grep '"event_type":"console_log"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl \
  | grep -E '"TimeTableCell handleDrop|세션 드롭 처리|updateSessionPosition"'

# dropEffect 값 확인 (none = 드래그 취소됨, move = 정상)
grep '"event_type":"console_log"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl \
  | grep "dropEffect"
```

---

## Phase 계획 (백로그)

| Phase | 목표 | 상태 | 선행 조건 |
|-------|------|------|----------|
| H | ghost-div 드래그 재설계 — 소스 블록은 제자리 유지, 별도 고스트 div가 타겟에 렌더 | BACKLOG | omni-radar 실제 마우스 로그 확보 |
| I | (원래 계획) logger.ts → JSONL 파일 저장 | SUPERSEDED | Chrome 확장 경로로 대체됨 |
