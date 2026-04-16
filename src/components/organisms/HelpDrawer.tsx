"use client";

import React from "react";
import { X } from "lucide-react";
import { useHelpDrawer } from "../../contexts/HelpDrawerContext";

const HELP_SECTIONS = [
  {
    title: "시간표 작성 시작하기",
    content:
      "먼저 학생과 과목을 등록하세요. 좌측 메뉴의 '학생', '과목' 탭에서 추가할 수 있습니다. 등록 후 시간표 화면에서 '+' 버튼을 눌러 수업을 추가하세요.",
  },
  {
    title: "일별·주간·월별 뷰",
    content:
      "우측 상단의 '일별·주간·월별' 버튼으로 보기 방식을 전환합니다. 주간 뷰에서 블록을 드래그해 시간을 이동할 수 있습니다.",
  },
  {
    title: "템플릿 저장·적용",
    content:
      "'현재 주를 템플릿으로 저장'으로 반복되는 시간표를 저장해 두세요. '저장된 템플릿 적용하기'로 다른 주에 동일한 배치를 한 번에 적용합니다.",
  },
  {
    title: "PDF 출력",
    content:
      "PDF 다운로드 버튼을 누르면 현재 보기 기준(일별·주간·월별)으로 시간표가 PDF로 저장됩니다. 인쇄 후 바로 사용할 수 있습니다.",
  },
  {
    title: "공유 링크",
    content:
      "'공유 링크'를 통해 학생이나 학부모에게 시간표를 공유할 수 있습니다. 링크는 설정 페이지에서 만료일을 지정해 생성합니다.",
  },
];

export function HelpDrawer() {
  const { isOpen, close } = useHelpDrawer();

  if (!isOpen) return null;

  return (
    <>
      <div
        data-testid="help-drawer-backdrop"
        className="fixed inset-0 z-[10000] bg-black/30"
        onClick={close}
      />
      <div className="fixed right-0 top-0 bottom-0 z-[10001] w-80 bg-[var(--color-bg-primary)] border-l border-[var(--color-border)] shadow-admin-lg flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg-primary)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            도움말
          </h2>
          <button
            onClick={close}
            aria-label="닫기"
            className="p-1 rounded-admin-md text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          {HELP_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-lg border border-[var(--color-border)] p-3"
            >
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                {section.title}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
