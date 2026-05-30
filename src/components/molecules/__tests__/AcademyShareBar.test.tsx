import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AcademyShareBar from "../AcademyShareBar";

describe("AcademyShareBar", () => {
  it("링크 없으면 '공유 링크 만들기' 버튼을 보여주고 onCreate 호출", () => {
    const onCreate = vi.fn();
    render(
      <AcademyShareBar
        shareUrl={null}
        expiresAt={null}
        onCreate={onCreate}
        onCopy={vi.fn()}
      />,
    );
    const btn = screen.getByTestId("academy-share-create");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("링크 있으면 URL + 복사 버튼을 보여주고 onCopy 호출", () => {
    const onCopy = vi.fn();
    render(
      <AcademyShareBar
        shareUrl="https://x.test/share/abc123"
        expiresAt={new Date(Date.now() + 30 * 86400000).toISOString()}
        onCreate={vi.fn()}
        onCopy={onCopy}
      />,
    );
    expect(screen.getByText("https://x.test/share/abc123")).toBeInTheDocument();
    const copy = screen.getByTestId("academy-share-copy");
    fireEvent.click(copy);
    expect(onCopy).toHaveBeenCalledOnce();
    // 생성 버튼은 없어야 함 (링크 있는 상태)
    expect(screen.queryByTestId("academy-share-create")).not.toBeInTheDocument();
  });

  it("만료일이 있으면 D-day 배지를 보여준다", () => {
    render(
      <AcademyShareBar
        shareUrl="https://x.test/share/abc"
        expiresAt={new Date(Date.now() + 10 * 86400000).toISOString()}
        onCreate={vi.fn()}
        onCopy={vi.fn()}
      />,
    );
    // 10일 후 → D-10 (calendar day 경계로 9~10 가능, D- prefix 확인)
    expect(screen.getByText(/^D-\d+$/)).toBeInTheDocument();
  });

  it("busy 상태면 생성 버튼이 disabled + '생성 중...'", () => {
    render(
      <AcademyShareBar
        shareUrl={null}
        expiresAt={null}
        onCreate={vi.fn()}
        onCopy={vi.fn()}
        busy
      />,
    );
    const btn = screen.getByTestId("academy-share-create") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn).toHaveTextContent("생성 중...");
  });
});
