import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDropdown } from "../NotificationDropdown";
import {
  clearAllNotifications,
  pushNotification,
} from "@/lib/notificationCenter";

const TEST_USER = "test-user-id";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: TEST_USER }, session: null, loading: false }),
}));

describe("NotificationDropdown", () => {
  // setupTests.ts의 localStorage가 vi.fn() mock이라 매 테스트 in-memory Map으로 spy 재설정
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.spyOn(window.localStorage, "getItem").mockImplementation(
      (k: string) => (k in store ? store[k] : null),
    );
    vi.spyOn(window.localStorage, "setItem").mockImplementation(
      (k: string, v: string) => {
        store[k] = v;
      },
    );
    vi.spyOn(window.localStorage, "removeItem").mockImplementation((k: string) => {
      delete store[k];
    });
  });

  afterEach(() => {
    clearAllNotifications(TEST_USER);
    vi.restoreAllMocks();
  });

  it("unread=0이면 종 아이콘만, 배지 X", () => {
    render(<NotificationDropdown />);
    expect(screen.getByLabelText("알림")).toBeInTheDocument();
    expect(screen.queryByText(/^[1-9]/)).not.toBeInTheDocument();
  });

  it("에러/경고 push 시 배지 카운트 증가", () => {
    pushNotification(TEST_USER, "error", "에러 메시지");
    pushNotification(TEST_USER, "warning", "경고 메시지");
    pushNotification(TEST_USER, "success", "성공 메시지"); // 카운트 제외
    render(<NotificationDropdown />);
    expect(screen.getByLabelText("알림 2개")).toBeInTheDocument();
  });

  it("종 클릭 시 패널 열림 + 항목 표시", () => {
    pushNotification(TEST_USER, "error", "테스트 에러");
    render(<NotificationDropdown />);

    fireEvent.click(screen.getByLabelText("알림 1개"));

    // 패널이 열리면 알림 헤더 + 메시지 보임
    expect(screen.getByRole("region", { name: "알림 히스토리" })).toBeInTheDocument();
    expect(screen.getByText("테스트 에러")).toBeInTheDocument();
  });

  it("필터 chip 클릭 시 해당 level만 필터", () => {
    pushNotification(TEST_USER, "error", "에러A");
    pushNotification(TEST_USER, "success", "성공A");
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByLabelText(/알림/));

    fireEvent.click(screen.getByRole("button", { name: "에러" }));

    expect(screen.getByText("에러A")).toBeInTheDocument();
    expect(screen.queryByText("성공A")).not.toBeInTheDocument();
  });

  it("항목 클릭 시 read 처리 → 배지 카운트 감소", () => {
    pushNotification(TEST_USER, "error", "곧 read될 에러");
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByLabelText("알림 1개"));

    // 항목의 메시지 button 클릭 (NotificationItem 내부 button)
    fireEvent.click(screen.getByText("곧 read될 에러"));

    // unread 감소 → 종 aria-label에서 "1개" 사라지고 "알림"으로
    expect(screen.getByLabelText("알림")).toBeInTheDocument();
  });

  it("모두 읽음 클릭 시 전체 read 처리", () => {
    pushNotification(TEST_USER, "error", "에러1");
    pushNotification(TEST_USER, "warning", "경고1");
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByLabelText("알림 2개"));

    fireEvent.click(screen.getByRole("button", { name: "모두 읽음" }));

    expect(screen.getByLabelText("알림")).toBeInTheDocument();
  });

  it("dismiss 클릭 시 항목 제거", () => {
    pushNotification(TEST_USER, "error", "지울 알림");
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByLabelText("알림 1개"));

    expect(screen.getByText("지울 알림")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이 알림 제거" }));

    expect(screen.queryByText("지울 알림")).not.toBeInTheDocument();
  });

  it("ESC 키로 패널 닫기", () => {
    pushNotification(TEST_USER, "error", "x");
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByLabelText("알림 1개"));
    expect(screen.getByRole("region", { name: "알림 히스토리" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("region", { name: "알림 히스토리" })).not.toBeInTheDocument();
  });

  it("빈 상태 — 필터 매치 0건 시 안내 메시지", () => {
    pushNotification(TEST_USER, "success", "성공만"); // 에러 필터링 시 0건
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByLabelText("알림"));

    fireEvent.click(screen.getByRole("button", { name: "에러" }));

    expect(screen.getByText("알림이 없습니다")).toBeInTheDocument();
  });
});
