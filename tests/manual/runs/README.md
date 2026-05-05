# UAT 실행 기록 (runs/)

이 디렉터리는 매 UAT 실행의 결과 사본을 누적 보관합니다.

## 파일 명명 규칙

`<YYYY-MM-DD-HHMM>-<commit-short>-<mode>.md`

예: `2026-05-05-1430-4dfaba9-core.md`

- `mode`: `core` (40분, P0만) / `extended` (80분, P0+P1) / `full` (120분, 전체)

## 워크플로우

```bash
# 1. 새 실행 인스턴스 생성 (메타 자동 채움)
bash scripts/uat-new.sh core   # 또는 extended / full

# 2. 생성된 파일 열고 시나리오 실행
#    [ ] → [x] (Pass) / [!] (Fail) / [~] (Skip) 기록
#    Fail 시 note에 어떤 단계에서 어떤 결과 나왔는지 작성

# 3. 결과 commit
git add tests/manual/runs/<file>.md
git commit -m "chore(uat): 2026-05-05-1430 core run — 19/19 P0 pass"

# 4. 최근 결과 요약
bash scripts/uat-summary.sh
```

## 추세 분석 (markdown + git만으로)

```bash
# 한 시나리오의 시계열 결과
grep -A1 'S-7.1' tests/manual/runs/*.md | grep 'Result:'

# 자주 Fail하는 시나리오 ranking
bash scripts/uat-summary.sh 20

# 특정 build에서 회귀 발생 여부
git log --oneline -- tests/manual/runs/ | head
```

## 정리 정책

- 실행 기록은 **삭제하지 않음** — 회귀 추적용 history.
- 1년 이상 된 기록은 별도 검토 후 archive.
- README.md, .gitkeep은 디렉터리 보존용. 삭제 금지.
