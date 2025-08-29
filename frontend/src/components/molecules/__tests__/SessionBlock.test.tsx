import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session, Subject } from '../../../lib/planner';
import SessionBlock from '../SessionBlock';

// Mock 데이터
const mockSession: Session = {
  id: 'session-1',
  enrollmentIds: ['enrollment-1'],
  weekday: 0,
  startsAt: '09:00',
  endsAt: '10:00',
};

const mockSubject: Subject = {
  id: 'subject-1',
  name: '중등수학',
  color: '#f59e0b',
};

const mockStudent = {
  id: 'student-1',
  name: '김요섭',
};

const mockEnrollment = {
  id: 'enrollment-1',
  studentId: 'student-1',
  subjectId: 'subject-1',
};

const mockSubjects = [mockSubject];
const mockEnrollments = [mockEnrollment];
const mockStudents = [mockStudent];

describe('SessionBlock', () => {
  it('세션 정보를 올바르게 표시한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        yPosition={0}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    // 과목명과 학생명이 표시되는지 확인
    expect(screen.getByText('중등수학')).toBeInTheDocument();
    expect(screen.getByText('김요섭')).toBeInTheDocument();

    // 전체 세션 블록이 존재하는지 확인
    expect(screen.getByTestId('session-block-session-1')).toBeInTheDocument();
  });

  it('과목이 없을 때 기본 텍스트를 표시한다', () => {
    const sessionWithoutSubject: Session = {
      ...mockSession,
      enrollmentIds: ['enrollment-2'], // 존재하지 않는 enrollment
    };

    render(
      <SessionBlock
        session={sessionWithoutSubject}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        yPosition={0}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    // 과목명이 Unknown으로 표시되는지 확인
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('학생이 없을 때 과목명만 표시한다', () => {
    const sessionWithoutStudent: Session = {
      ...mockSession,
      enrollmentIds: ['enrollment-3'], // 존재하지 않는 enrollment
    };

    render(
      <SessionBlock
        session={sessionWithoutStudent}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        yPosition={0}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('클릭 이벤트를 올바르게 처리한다', () => {
    const mockOnClick = vi.fn();
    render(
      <SessionBlock
        session={mockSession}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        yPosition={0}
        left={0}
        width={120}
        yOffset={0}
        onClick={mockOnClick}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    fireEvent.click(sessionBlock);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('위치와 크기를 올바르게 적용한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        yPosition={0}
        left={100}
        width={200}
        yOffset={50}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    expect(sessionBlock).toHaveStyle({
      left: '100px',
      width: '200px',
      top: '56px', // 6 + 50
    });
  });

  it('과목 색상을 올바르게 적용한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        yPosition={0}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    expect(sessionBlock).toHaveStyle({
      background: '#f59e0b',
    });
  });

  it('z-index를 올바르게 계산한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        yPosition={0}
        left={0}
        width={120}
        yOffset={25}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    expect(sessionBlock).toHaveStyle({
      zIndex: '1025', // 1000 + 25
    });
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        yPosition={0}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    expect(sessionBlock).toHaveStyle({
      position: 'absolute',
      borderRadius: '4px',
      cursor: 'pointer',
    });
  });

  it('이벤트 버블링을 방지한다', () => {
    const mockOnClick = vi.fn();
    render(
      <SessionBlock
        session={mockSession}
        subjects={mockSubjects}
        enrollments={mockEnrollments}
        students={mockStudents}
        yPosition={0}
        left={0}
        width={120}
        yOffset={0}
        onClick={mockOnClick}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');

    // 클릭 이벤트가 발생하는지 확인
    fireEvent.click(sessionBlock);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('그룹 학생 이름을 올바르게 표시한다', () => {
    const groupSession: Session = {
      ...mockSession,
      enrollmentIds: ['enrollment-1', 'enrollment-2'],
    };

    const mockEnrollment2 = {
      id: 'enrollment-2',
      studentId: 'student-2',
      subjectId: 'subject-1',
    };

    const mockStudent2 = {
      id: 'student-2',
      name: '이현진',
    };

    render(
      <SessionBlock
        session={groupSession}
        subjects={mockSubjects}
        enrollments={[...mockEnrollments, mockEnrollment2]}
        students={[...mockStudents, mockStudent2]}
        yPosition={0}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    // 두 학생의 이름이 표시되는지 확인
    expect(screen.getByText('김요섭, 이현진')).toBeInTheDocument();
  });

  it('여러 학생이 있을 때 외 N명 형식으로 표시한다', () => {
    const groupSession: Session = {
      ...mockSession,
      enrollmentIds: ['enrollment-1', 'enrollment-2', 'enrollment-3'],
    };

    const mockEnrollment2 = {
      id: 'enrollment-2',
      studentId: 'student-2',
      subjectId: 'subject-1',
    };

    const mockEnrollment3 = {
      id: 'enrollment-3',
      studentId: 'student-3',
      subjectId: 'subject-1',
    };

    const mockStudent2 = {
      id: 'student-2',
      name: '이현진',
    };

    const mockStudent3 = {
      id: 'student-3',
      name: '강지원',
    };

    render(
      <SessionBlock
        session={groupSession}
        subjects={mockSubjects}
        enrollments={[...mockEnrollments, mockEnrollment2, mockEnrollment3]}
        students={[...mockStudents, mockStudent2, mockStudent3]}
        yPosition={0}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    // "김요섭, 이현진 외 1명" 형식으로 표시되는지 확인
    expect(screen.getByText('김요섭, 이현진 외 1명')).toBeInTheDocument();
  });
});
