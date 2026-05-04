# Smooth refetch (다른 admin 변경 시 부드러운 데이터 갱신)

**상태**: Deferred — 사용자 피드백 보고 결정
**관련 PR**: #209 (banner → toast 변경)
**제안 시각**: 2026-05-04

## Context

PR #209에서 "다른 관리자가 시간표를 변경했어요" 알림을 banner에서 토스트로 옮기고 [새로고침] 버튼을 추가함. 클릭 시 동작:

```ts
onAction: () => {
  ackScheduleChanges();
  window.location.reload();
}
```

`window.location.reload()`는 **페이지 전체 다시 로드** — 안전하지만 거침:
- 화면 흰색 깜빡임 (반 초~1초)
- React state 모두 초기화 (모달, 스크롤 위치, 진행 중 작업 등)
- HTML/CSS/JS 다시 다운로드 (캐시되어 있어도 약간 비용)

## 제안: 부드러운 refetch

페이지 reload 없이 **API 데이터만** 다시 가져와서 React state 갱신:

```
사용자 [새로고침] 클릭
  ↓
GET /api/sessions, /api/students, /api/enrollments... 백그라운드 호출
  ↓
React state 갱신 → UI 자연스럽게 시간표 부분만 다시 그림
  ↓
모달/스크롤/선택 상태 모두 그대로 유지
```

## 장단점

| 측면 | 현재 reload | 부드러운 refetch |
|---|---|---|
| 시각 경험 | 깜빡임 + 1~2초 정지 | 매끄러움 |
| 사용자 진행 상태 | 다 리셋 | 유지 |
| 구현 복잡도 | 한 줄 | 중간 (refetch API 노출 + 다중 entity 조율) |
| 안전성 | 100% — stale 강제 리셋 | 데이터만 갱신 — UI 어딘가 stale 잔재 가능 |
| 신뢰성 | 항상 동작 | 라이브러리/네트워크 의존도 |

## 도입 권장 시점

다음 중 하나라도 해당하면 도입 검토:

- [ ] **다중 admin 사용이 잦아져서** [새로고침] 클릭 빈도가 일주일에 5회 이상
- [ ] **모달/폼 작성 중에** 알림이 뜨는 경우가 빈번해서 사용자가 불편 호소
- [ ] **모바일 사용자 비중이 높아짐** (모바일은 reload 비용이 데스크톱보다 큼)
- [ ] 다른 lightweight 데이터 갱신 흐름(예: students/subjects 페이지의 외부 변경 감지)에서도 부드러운 갱신이 필요해질 때

## 구현 가이드 (도입 결정 시)

### 1. `useIntegratedDataLocal` hook에 `refetch` 노출

현재 hook 내부에서만 fetchFromServer 호출. 외부에서도 trigger 가능하게:

```ts
// src/hooks/useIntegratedDataLocal.ts
return {
  ...
  refetch: useCallback(async () => {
    const userId = localStorage.getItem("supabase_user_id");
    if (!userId) return;
    await fetchFromServer(userId);
    loadDataFromLocal();
  }, [loadDataFromLocal]),
};
```

### 2. `schedule/page.tsx` 토스트 액션 변경

```ts
// 현재
onAction: () => {
  ackScheduleChanges();
  window.location.reload();
}

// 도입 후
onAction: async () => {
  ackScheduleChanges();
  try {
    await refetchAllData();
    showToast("success", "최신 시간표로 갱신됐어요");
  } catch {
    // refetch 실패 시 fallback — 기존 reload 동작
    window.location.reload();
  }
}
```

### 3. 다중 entity 조율

class-planner는 sessions / students / subjects / enrollments / teachers 5개 entity 를 같이 사용. 다른 admin 변경이 sessions 외 entity도 바꿨을 가능성이 있음. 보수적으로 모두 refetch:

```ts
await Promise.all([
  refetchSessions(),
  refetchEnrollments(),
  refetchStudents(),
  refetchSubjects(),
  refetchTeachers(),
]);
```

또는 server response에 `changedEntities` 정보가 있으면 변경된 것만 refetch 가능 (서버 API 변경 필요).

### 4. 회귀 가드 e2e

```ts
test("토스트 [새로고침] 클릭 → 화면 깜빡임 없이 sessions 갱신", async ({ page }) => {
  // 시드: 본인 sessions
  // 외부에서 sessions 변경 시뮬레이션 (다른 탭 또는 fetch mock)
  // 토스트 발화 후 [새로고침] 클릭
  // expect: page.url() 그대로 (reload 안 일어남)
  // expect: 시간표에 새 sessions 반영
  // expect: 모달 등 다른 state 유지
});
```

## 한계 / 주의

### 부분 갱신 위험
- sessions만 refetch했는데 enrollments는 안 가져왔다면 시간표에 학생 이름이 잘못 보일 수 있음
- 해결: 모든 dependent entity 같이 refetch (위 #3 참조)

### Race condition
- 사용자가 refetch 진행 중에 본인이 또 변경하면?
- 해결: refetch 시작 전에 진행 중인 sync outbox flush 먼저, 또는 refetch 완료 후 본인 작업 결과로 다시 덮어쓰기

### 실패 fallback
- refetch 실패(네트워크 오류 등) 시 사용자는 stale 데이터 그대로 봄
- 해결: try/catch로 reload fallback (위 #2 참조)

## 관련 파일

- `src/app/schedule/page.tsx` — 토스트 액션 핸들러
- `src/hooks/useIntegratedDataLocal.ts` — refetch API 노출 위치
- `src/hooks/useScheduleMeta.ts` — banner trigger (PR #209 변경)
- `src/lib/toast.ts` — `showActionToast` 헬퍼

## 결론

지금은 reload가 단순하고 안전. 사용자 피드백 보고 위 트리거 중 하나라도 해당하면 도입 검토.
