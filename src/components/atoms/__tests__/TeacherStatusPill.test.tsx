/**
 * TeacherStatusPill 회귀 가드 (Variant P + X + Role color SSOT).
 *
 * 검증:
 *  - status='owner' → owner 아이콘·색 (강제, role prop 무시)
 *  - status='active' + role='admin' → admin 아이콘·색 (Shield + blue)
 *  - status='active' (role 미전달) → member 아이콘·색 (GraduationCap + emerald)
 *  - pending status (invite_pending/invite_expired/none) → chip 자체 opacity-50
 *  - chip 색은 role 색 항상 유지 — status 와 무관 (강사 invite_pending 도 emerald)
 *
 * 안정 selector: data-testid="pill-{role}[-dimmed]" (chip 전체) + "pill-icon-{role}[-dimmed]" (아이콘).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherStatusPill } from "../TeacherStatusPill";

describe("TeacherStatusPill — Role color SSOT 회귀 가드", () => {
  it("status='owner' → owner chip + 아이콘 + 라벨 '원장' (amber)", () => {
    render(<TeacherStatusPill status="owner" />);
    expect(screen.getByTestId("pill-owner")).toBeInTheDocument();
    expect(screen.getByTestId("pill-icon-owner")).toBeInTheDocument();
    expect(screen.getByText("원장")).toBeInTheDocument();
    // amber 색 클래스 적용 검증
    const chip = screen.getByTestId("pill-owner");
    expect(chip.className).toContain("text-amber-300");
    expect(chip.className).toContain("bg-amber-500/20");
  });

  it("status='owner' + role='admin' 전달해도 owner 가 우선", () => {
    render(<TeacherStatusPill status="owner" role="admin" />);
    expect(screen.getByTestId("pill-owner")).toBeInTheDocument();
    expect(screen.queryByTestId("pill-admin")).toBeNull();
  });

  it("status='active' + role='admin' → admin chip (blue + Shield)", () => {
    render(<TeacherStatusPill status="active" role="admin" />);
    const chip = screen.getByTestId("pill-admin");
    expect(chip).toBeInTheDocument();
    expect(chip.className).toContain("text-blue-300");
    expect(chip.className).toContain("bg-blue-500/20");
    expect(screen.getByTestId("pill-icon-admin")).toBeInTheDocument();
  });

  it("status='active' (role 미전달) → member chip (emerald + GraduationCap)", () => {
    render(<TeacherStatusPill status="active" />);
    const chip = screen.getByTestId("pill-member");
    expect(chip).toBeInTheDocument();
    expect(chip.className).toContain("text-emerald-300");
    expect(chip.className).toContain("bg-emerald-500/20");
    expect(screen.getByTestId("pill-icon-member")).toBeInTheDocument();
  });

  // ─── 핵심 회귀 가드 (사용자 요청 2026-05-20): 강사 invite_pending 도 emerald ───
  it("status='invite_pending' + role 미전달 → member chip emerald (yellow X) + dimmed", () => {
    render(<TeacherStatusPill status="invite_pending" />);
    const chip = screen.getByTestId("pill-member-dimmed");
    expect(chip).toBeInTheDocument();
    expect(chip.className).toContain("text-emerald-300"); // role 색 유지
    expect(chip.className).toContain("bg-emerald-500/20");
    expect(chip.className).toContain("opacity-50"); // X variant
    expect(chip.className).not.toMatch(/yellow/); // 이전 yellow 회귀 차단
  });

  it("status='invite_pending' + role='admin' → admin chip blue + dimmed", () => {
    render(<TeacherStatusPill status="invite_pending" role="admin" />);
    const chip = screen.getByTestId("pill-admin-dimmed");
    expect(chip).toBeInTheDocument();
    expect(chip.className).toContain("text-blue-300");
    expect(chip.className).toContain("opacity-50");
  });

  it("status='invite_expired' → role 색 유지 + dimmed (red X)", () => {
    render(<TeacherStatusPill status="invite_expired" />);
    const chip = screen.getByTestId("pill-member-dimmed");
    expect(chip.className).toContain("text-emerald-300"); // role 색
    expect(chip.className).toContain("opacity-50");
    expect(chip.className).not.toMatch(/red-/); // 이전 red 회귀 차단
  });

  it("status='none' (미초대) → role 색 유지 + dimmed (slate X)", () => {
    render(<TeacherStatusPill status="none" />);
    const chip = screen.getByTestId("pill-member-dimmed");
    expect(chip.className).toContain("text-emerald-300");
    expect(chip.className).toContain("opacity-50");
    expect(chip.className).not.toMatch(/slate/); // 이전 slate 회귀 차단
  });

  it("status='share_only' → role 색 유지 (blue admin 색과 헷갈리지 않음, 정상 chip)", () => {
    render(<TeacherStatusPill status="share_only" />);
    // share_only 는 강사가 시간표만 공유받는 상태 → member 색 + dimmed X (정상)
    const chip = screen.getByTestId("pill-member");
    expect(chip.className).toContain("text-emerald-300");
    expect(chip.className).not.toContain("opacity-50");
  });

  it("status='active' → dimmed X (정상 chip)", () => {
    render(<TeacherStatusPill status="active" />);
    expect(screen.queryByTestId("pill-member-dimmed")).toBeNull();
    const chip = screen.getByTestId("pill-member");
    expect(chip.className).not.toContain("opacity-50");
  });

  it("status='owner' → dimmed X (정상 chip)", () => {
    render(<TeacherStatusPill status="owner" />);
    expect(screen.queryByTestId("pill-owner-dimmed")).toBeNull();
    const chip = screen.getByTestId("pill-owner");
    expect(chip.className).not.toContain("opacity-50");
  });

  it("invite_pending + expiresAt 전달 시 라벨에 'D-N' 포함", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    render(<TeacherStatusPill status="invite_pending" expiresAt={future} />);
    expect(screen.getByText(/초대 대기 · D-/)).toBeInTheDocument();
  });
});
