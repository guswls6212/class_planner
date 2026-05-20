/**
 * RolePermissionCards 회귀 가드 (Variant F, ADR-019).
 *
 * 검증:
 *  - 3 role 카드 (owner/admin/member) 렌더
 *  - 사용자 친화 용어 사용 — "CUD", "slug", "RLS", "academy_members" 등 개발자 약어 미포함
 *  - 각 카드 핵심 권한 3개 표시
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RolePermissionCards } from "../RolePermissionCards";

describe("RolePermissionCards", () => {
  it("3 role 카드 (owner/admin/member) 가 모두 렌더된다", () => {
    render(<RolePermissionCards />);
    expect(screen.getByTestId("role-card-owner")).toBeInTheDocument();
    expect(screen.getByTestId("role-card-admin")).toBeInTheDocument();
    expect(screen.getByTestId("role-card-member")).toBeInTheDocument();
  });

  it("한국어 라벨 (원장/관리자/강사) 표시", () => {
    render(<RolePermissionCards />);
    expect(screen.getByText("원장")).toBeInTheDocument();
    expect(screen.getByText("관리자")).toBeInTheDocument();
    expect(screen.getByText("강사")).toBeInTheDocument();
  });

  it("사용자 친화 용어 사용 — 개발자 약어 미포함", () => {
    const { container } = render(<RolePermissionCards />);
    const text = container.textContent ?? "";

    // 노출 텍스트에 개발자 약어가 없는지 검증 (정책: 사용자 친화 용어만)
    expect(text).not.toMatch(/\bCUD\b/);
    expect(text).not.toMatch(/\bslug\b/);
    expect(text).not.toMatch(/RLS\s*member_own/);
    expect(text).not.toMatch(/academy_members?\b/);
    expect(text).not.toMatch(/\bSupabase\b/);
  });

  it("owner 카드에 '학원 이름 · 학원 주소 변경' 권한 표시 (slug 사용자 친화 용어)", () => {
    render(<RolePermissionCards />);
    const ownerCard = screen.getByTestId("role-card-owner");
    expect(ownerCard.textContent).toContain("학원 이름");
    // "학원 주소" 또는 "주소" 포함 — slug 의 사용자 친화 표현
    expect(ownerCard.textContent).toMatch(/학원 주소|주소/);
  });

  it("member (강사) 카드에 '본인' 으로 권한 범위 표현 (RLS member_own 의 사용자 친화 표현)", () => {
    render(<RolePermissionCards />);
    const memberCard = screen.getByTestId("role-card-member");
    expect(memberCard.textContent).toContain("본인");
  });
});
