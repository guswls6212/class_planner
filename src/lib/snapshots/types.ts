import type { ClassPlannerData } from "../localStorageCrud";

/** 백업 종류 — retention 정책 + freemium 잠금 정책이 다름. */
export type SnapshotType = "auto_template" | "before_conflict" | "manual";

/** API 응답 / 설정 페이지에서 list로 받는 단일 snapshot 메타. data_payload는
 * 미리보기 모드 (얕은 카운트)에서 별도 필드로 노출. 전체 payload 복원 시점까지 fetch 안 함. */
export interface DataSnapshotMeta {
  id: string;
  academyId: string;
  snapshotType: SnapshotType;
  createdBy: string | null;
  createdAt: string; // ISO
  restoredFromId: string | null;
  description: string | null;
  /** 미리보기용 카운트 — 서버에서 미리 계산해 반환 (전체 payload 다운로드 회피). */
  counts: {
    students: number;
    subjects: number;
    sessions: number;
    enrollments: number;
    teachers: number;
  };
}

/** 복원 시점에만 fetch 하는 전체 데이터. */
export interface DataSnapshotFull extends DataSnapshotMeta {
  dataPayload: ClassPlannerData | { local: ClassPlannerData; server: ClassPlannerData };
}

export interface CreateSnapshotInput {
  type: SnapshotType;
  payload: ClassPlannerData | { local: ClassPlannerData; server: ClassPlannerData };
  description?: string | null;
}
