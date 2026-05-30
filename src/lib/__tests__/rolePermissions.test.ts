/**
 * rolePermissions SSOT helper 회귀 가드.
 *
 * 검증:
 *  - getRolePermissionsPreview 가 모든 role 에 대해 같은 개수 반환
 *  - 같은 role 호출 시 RolePermissionCards / InviteModal 모두 동일 항목 표시 보장
 *  - ROLE_PERMISSIONS_PREVIEW_COUNT 상수가 SSOT 임을 보장
 */

import { describe, expect, it } from "vitest";
import {
  ROLE_DESCRIPTORS,
  ROLE_KEYS_ORDERED,
  ROLE_PERMISSIONS_PREVIEW_COUNT,
  getRolePermissionsPreview,
} from "../rolePermissions";

describe("rolePermissions — SSOT preview helper", () => {
  it("getRolePermissionsPreview 가 모든 role 에 같은 개수(ROLE_PERMISSIONS_PREVIEW_COUNT) 반환", () => {
    for (const role of ROLE_KEYS_ORDERED) {
      const preview = getRolePermissionsPreview(role);
      expect(preview.length).toBe(ROLE_PERMISSIONS_PREVIEW_COUNT);
    }
  });

  it("ROLE_PERMISSIONS_PREVIEW_COUNT 가 가장 짧은 permissions 길이 이하", () => {
    // permissions 길이 < PREVIEW_COUNT 시 slice 가 적은 개수 반환 → 일관성 깨짐
    for (const role of ROLE_KEYS_ORDERED) {
      const total = ROLE_DESCRIPTORS[role].permissions.length;
      expect(total).toBeGreaterThanOrEqual(ROLE_PERMISSIONS_PREVIEW_COUNT);
    }
  });

  it("같은 role 두 번 호출 시 동일 항목 반환 (deterministic)", () => {
    for (const role of ROLE_KEYS_ORDERED) {
      const first = getRolePermissionsPreview(role);
      const second = getRolePermissionsPreview(role);
      expect(first.map((p) => p.text)).toEqual(second.map((p) => p.text));
      expect(first.map((p) => p.ok)).toEqual(second.map((p) => p.ok));
    }
  });

  it("preview 항목은 ROLE_DESCRIPTORS.permissions 의 앞 N 개와 일치", () => {
    for (const role of ROLE_KEYS_ORDERED) {
      const preview = getRolePermissionsPreview(role);
      const expected = ROLE_DESCRIPTORS[role].permissions.slice(
        0,
        ROLE_PERMISSIONS_PREVIEW_COUNT,
      );
      expect(preview).toEqual(expected);
    }
  });
});
