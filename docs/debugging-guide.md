# class-planner 디버깅 가이드

> 목적: 코드 변경 없이 브라우저 런타임 이벤트를 Claude가 직접 읽을 수 있는 JSONL 파일로 수집하는 방법을 기록.
> 갱신: 새로운 방법이 추가될 때마다 업데이트.

---

## 현재 채택 방식: omni-radar + Chrome 확장

### 왜 이 방식인가

`logger.ts`가 내부적으로 `console.log`를 직접 호출하므로, Chrome 확장이 `console.log`를 후킹하면
class-planner 소스 코드 한 줄도 바꾸지 않고 모든 `logger.info/warn/error` 출력이 omni-radar로 흘러 들어간다.

```
class-planner (localhost:3000)
    logger.ts → console.log(JSON)
        ↓ Chrome 확장 hooks console.log
    omni-radar-extension content_script.js (document_start)
        ↓ POST /ingest/batch (sendBeacon)
    omni-radar (localhost:8888)
        ↓ WebSocket 브로드캐스트 + JSONL 기록
    logs/radar_YYYYMMDD.jsonl  ← Claude가 Grep으로 직접 읽음
```

### 포착 범위

| 이벤트 | 포착 여부 | 비고 |
|--------|-----------|------|
| `logger.info/warn/error` 출력 | ✅ | console.log 후킹 경유 |
| 드래그 이벤트 로그 (dragstart/dragover/drop/dragend) | ✅ | logger.info 경유 |
| fetch/XHR 호출 및 응답 | ✅ | XHR 인터셉션 |
| JS 에러, Promise rejection | ✅ | window.onerror / unhandledrejection |
| Next.js API 라우트 서버사이드 로그 | ❌ | Node.js 런타임, 미지원 |
| localStorage 읽기/쓰기 | ✅ | `radar_console_hook.js` Storage 후킹 (2026-04-24 구현). op: write/read/delete/clear, key, value_preview(500자), value_length 캡처. `event_type:"storage"` |
| React 상태 변화 | ❌ | React DevTools 연동 필요 |

---

## 설정 방법 (최초 1회)

### 1. omni-radar 서버 시작

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar
PYTHONPATH=. .venv/bin/python -m radar_agent radar_server:app --host 127.0.0.1 --port 8888
```

별도 터미널 유지 필요. 대시보드: http://127.0.0.1:8888

### 2. Chrome 확장 설치 (최초 1회)

1. Chrome → `chrome://extensions/` → 개발자 모드 ON
2. "압축 해제된 확장 프로그램 로드" → `/Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar-extension/` 선택
3. 확장 아이콘 클릭 → 설정:
   - **서버 URL:** `http://127.0.0.1:8888`
   - **대상 URL 패턴:** `http://localhost:3000/*`
   - 활성화 토글 ON

### 3. class-planner 개발 서버 시작

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm run dev
```

### 4. 동작 확인

1. Chrome에서 `http://localhost:3000` 접속
2. 확장 아이콘 배지에 "ON" 표시 확인
3. 개발자 도구 콘솔에서:
   ```javascript
   console.log("omni-radar test")
   ```
4. `http://127.0.0.1:8888` 대시보드에서 `console_log` 이벤트 확인

---

## Claude가 로그를 읽는 방법

omni-radar 서버가 실행 중이어야 로그 파일이 생성됩니다.

```bash
# 오늘 날짜 브라우저 이벤트 전부
grep '"event_type":"console_log"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl

# 드래그 관련 로그만 (dragstart, dragover, drop, dragend 키워드)
grep -E '"event_type":"console_log"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl \
  | grep -i "drag"

# fetch/XHR 호출
grep '"event_type":"client_fetch"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl

# JS 에러
grep '"event_type":"console_log"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl \
  | grep '"level":"error"'

# localStorage 변경 (Storage 후킹 — 2026-04-24 추가)
grep '"event_type":"storage"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl

# classPlannerData 키만 (드래그 관련 핵심 키)
grep '"event_type":"storage"' \
  /Users/leo/lee_file/entrepreneur/project/dev-pack/omni-radar/logs/radar_$(date +%Y%m%d).jsonl \
  | grep "classPlannerData"
```

---

## 알려진 한계 및 개선 대기 항목

| 한계 | 원인 | 개선 방향 | 상태 |
|------|------|-----------|------|
| ~~localStorage 변화 미포착~~ | ~~Storage API 미후킹~~ | **완료** — `radar_console_hook.js` Storage 후킹 구현 (2026-04-24) | ✅ DONE |
| Next.js 서버사이드 미포착 | Node.js 런타임 | 역방향 프록시 모드 or Next.js SDK | 장기 |
| Vite HMR 후 재주입 안 됨 | content_script 재실행 안 함 | MV3 navigation listener 추가 | 단기 |
| Stream LLM 미지원 | 버퍼링 금지 원칙 | 별도 스트림 이벤트 타입 | 중기 |

---

## 대안 방식 (현재 미채택)

### A. Phase I MVP (로컬 JSONL)
- `src/app/api/dev/log/route.ts` → `logs/browser-YYYYMMDD.jsonl`
- 장점: omni-radar 없이 동작, 구현 빠름
- 단점: 대시보드 없음, omni-radar 통합 안 됨
- 판단: Chrome 확장 경로가 충분하므로 불필요

### B. Next.js → omni-radar HTTP ingest
- logger.ts가 직접 POST /ingest/batch 호출
- 장점: 서버사이드 로그도 포착 가능
- 단점: 코드 변경 필요, omni-radar 서버 의존성
- 상태: 향후 서버사이드 디버깅 필요 시 검토
