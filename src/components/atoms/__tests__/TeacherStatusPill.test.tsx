/**
 * TeacherStatusPill 회귀 가드 (Variant P + X).
 *
 * 검증:
 *  - status='owner' → Crown 아이콘 (강제, role prop 무시)
 *  - status='active' + role='admin' → Shield 아이콘
 *  - status='active' (role 미전달) → GraduationCap (member fallback)
 *  - pending status (invite_pending/invite_expired/none) → 아이콘 dimmed 마커
 *  - active/owner → 아이콘 dimmed X
 *
 * 안정 selector: data-testid="pill-icon-{role}[-dimmed]" 사용 (test-authoring §4).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherStatusPill } from "../TeacherStatusPill";

describe("TeacherStatusPill — Variant P + X 회귀 가드", () => {
  it("status='owner' → owner 아이콘 (Crown) + 라벨 '원장'", () => {
    render(<TeacherStatusPill status="owner" />);
    expect(screen.getByTestId("pill-icon-owner")).toBeInTheDocument();
    expect(screen.getByText("원장")).toBeInTheDocument();
  });

  it("status='owner' + role='admin' 전달해도 owner 가 우선", () => {
    render(<TeacherStatusPill status="owner" role="admin" />);
    expect(screen.getByTestId("pill-icon-owner")).toBeInTheDocument();
    expect(screen.queryByTestId("pill-icon-admin")).toBeNull();
  });

  it("status='active' + role='admin' → admin 아이콘 (Shield)", () => {
    render(<TeacherStatusPill status="active" role="admin" />);
    expect(screen.getByTestId("pill-icon-admin")).toBeInTheDocument();
  });

  it("status='active' (role 미전달) → member 아이콘 (GraduationCap fallback)", () => {
    render(<TeacherStatusPill status="active" />);
    expect(screen.getByTestId("pill-icon-member")).toBeInTheDocument();
  });

  it("status='invite_pending' → 아이콘 dimmed marker", () => {
    render(<TeacherStatusPill status="invite_pending" />);
    expect(screen.getByTestId("pill-icon-member-dimmed")).toBeInTheDocument();
  });

  it("status='invite_expired' → 아이콘 dimmed marker", () => {
    render(<TeacherStatusPill status="invite_expired" />);
    expect(screen.getByTestId("pill-icon-member-dimmed")).toBeInTheDocument();
  });

  it("status='none' (미초대) → 아이콘 dimmed marker", () => {
    render(<TeacherStatusPill status="none" />);
    expect(screen.getByTestId("pill-icon-member-dimmed")).toBeInTheDocument();
  });

  it("status='active' → 아이콘 dimmed marker X", () => {
    render(<TeacherStatusPill status="active" />);
    expect(screen.queryByTestId("pill-icon-member-dimmed")).toBeNull();
  });

  it("status='owner' → 아이콘 dimmed marker X", () => {
    render(<TeacherStatusPill status="owner" />);
    expect(screen.queryByTestId("pill-icon-owner-dimmed")).toBeNull();
  });

  it("invite_pending + expiresAt 전달 시 라벨에 'D-N' 포함", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    render(<TeacherStatusPill status="invite_pending" expiresAt={future} />);
    expect(screen.getByText(/초대 대기 · D-/)).toBeInTheDocument();
  });
});
