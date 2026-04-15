import { describe, it, expect } from "vitest";
import {
  findDuplicateStudent,
  findDuplicateSubject,
  findDuplicateEnrollment,
  findDuplicateSession,
} from "../deduplication";
import type { Student, Subject, Enrollment, Session } from "../../planner";

// ---------------------------------------------------------------------------
// findDuplicateStudent
// ---------------------------------------------------------------------------
describe("findDuplicateStudent", () => {
  const serverStudents: Student[] = [
    { id: "s1", name: "홍길동", gender: "male", birthDate: "2010-01-01" },
    { id: "s2", name: "김철수", gender: "male", birthDate: "2011-05-15" },
    { id: "s3", name: "이영희", gender: "female" }, // birthDate 없음
  ];

  it("세 필드가 모두 존재하고 모두 일치하면 서버 학생을 반환한다", () => {
    const local: Student = {
      id: "local-1",
      name: "홍길동",
      gender: "male",
      birthDate: "2010-01-01",
    };
    expect(findDuplicateStudent(local, serverStudents)).toEqual(serverStudents[0]);
  });

  it("로컬에 birthDate가 없으면 null을 반환한다", () => {
    const local: Student = {
      id: "local-2",
      name: "홍길동",
      gender: "male",
      // birthDate 없음
    };
    expect(findDuplicateStudent(local, serverStudents)).toBeNull();
  });

  it("서버 학생에 gender가 없으면 null을 반환한다", () => {
    const local: Student = {
      id: "local-3",
      name: "이영희",
      gender: "female",
      birthDate: "2012-03-20",
    };
    // serverStudents[2]는 birthDate가 없으므로 매칭 불가
    expect(findDuplicateStudent(local, serverStudents)).toBeNull();
  });

  it("이름이 다르면 null을 반환한다", () => {
    const local: Student = {
      id: "local-4",
      name: "박민수",
      gender: "male",
      birthDate: "2010-01-01",
    };
    expect(findDuplicateStudent(local, serverStudents)).toBeNull();
  });

  it("gender가 다르면 null을 반환한다", () => {
    const local: Student = {
      id: "local-5",
      name: "홍길동",
      gender: "female", // 성별 불일치
      birthDate: "2010-01-01",
    };
    expect(findDuplicateStudent(local, serverStudents)).toBeNull();
  });

  it("로컬에 gender가 없으면 null을 반환한다", () => {
    const local: Student = {
      id: "local-6",
      name: "홍길동",
      birthDate: "2010-01-01",
      // gender 없음
    };
    expect(findDuplicateStudent(local, serverStudents)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findDuplicateSubject
// ---------------------------------------------------------------------------
describe("findDuplicateSubject", () => {
  const serverSubjects: Subject[] = [
    { id: "sub1", name: "수학", color: "#ff0000" },
    { id: "sub2", name: "영어" },
  ];

  it("이름이 정확히 일치하면 서버 과목을 반환한다", () => {
    const local: Subject = { id: "local-sub1", name: "수학" };
    expect(findDuplicateSubject(local, serverSubjects)).toEqual(serverSubjects[0]);
  });

  it("이름이 다르면 null을 반환한다", () => {
    const local: Subject = { id: "local-sub2", name: "과학" };
    expect(findDuplicateSubject(local, serverSubjects)).toBeNull();
  });

  it("대소문자가 다르면 null을 반환한다 (case-sensitive)", () => {
    const local: Subject = { id: "local-sub3", name: "Math" };
    const serverWithEnglish: Subject[] = [{ id: "srv1", name: "math" }];
    expect(findDuplicateSubject(local, serverWithEnglish)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findDuplicateEnrollment
// ---------------------------------------------------------------------------
describe("findDuplicateEnrollment", () => {
  const serverEnrollments: Enrollment[] = [
    { id: "en1", studentId: "s1", subjectId: "sub1" },
    { id: "en2", studentId: "s2", subjectId: "sub2" },
  ];

  it("매핑된 studentId/subjectId 쌍이 일치하면 서버 수강을 반환한다", () => {
    const local: Enrollment = {
      id: "local-en1",
      studentId: "local-s1",
      subjectId: "local-sub1",
    };
    const studentIdMap = new Map([["local-s1", "s1"]]);
    const subjectIdMap = new Map([["local-sub1", "sub1"]]);
    expect(
      findDuplicateEnrollment(local, serverEnrollments, studentIdMap, subjectIdMap)
    ).toEqual(serverEnrollments[0]);
  });

  it("studentId 매핑이 없으면 null을 반환한다", () => {
    const local: Enrollment = {
      id: "local-en2",
      studentId: "unknown-student",
      subjectId: "local-sub1",
    };
    const studentIdMap = new Map<string, string>(); // 매핑 없음
    const subjectIdMap = new Map([["local-sub1", "sub1"]]);
    expect(
      findDuplicateEnrollment(local, serverEnrollments, studentIdMap, subjectIdMap)
    ).toBeNull();
  });

  it("과목이 달라 일치하는 쌍이 없으면 null을 반환한다", () => {
    const local: Enrollment = {
      id: "local-en3",
      studentId: "local-s1",
      subjectId: "local-sub3",
    };
    const studentIdMap = new Map([["local-s1", "s1"]]);
    const subjectIdMap = new Map([["local-sub3", "sub3"]]); // sub3은 서버에 없음
    expect(
      findDuplicateEnrollment(local, serverEnrollments, studentIdMap, subjectIdMap)
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findDuplicateSession
// ---------------------------------------------------------------------------
describe("findDuplicateSession", () => {
  // 서버 ID 기준으로 설정
  const serverStudentId = "srv-s1";
  const serverSubjectId = "srv-sub1";

  const serverEnrollments: Enrollment[] = [
    { id: "srv-en1", studentId: serverStudentId, subjectId: serverSubjectId },
  ];

  const serverSessions: Session[] = [
    {
      id: "srv-sess1",
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      enrollmentIds: ["srv-en1"],
    },
  ];

  const localStudentId = "local-s1";
  const localSubjectId = "local-sub1";
  const localEnrollmentId = "local-en1";

  const localEnrollments: Enrollment[] = [
    { id: localEnrollmentId, studentId: localStudentId, subjectId: localSubjectId },
  ];

  const studentIdMap = new Map([[localStudentId, serverStudentId]]);
  const subjectIdMap = new Map([[localSubjectId, serverSubjectId]]);
  const enrollmentIdMap = new Map([[localEnrollmentId, "srv-en1"]]);

  it("같은 요일+시작시간+학생+과목이면 서버 세션을 반환한다", () => {
    const local: Session = {
      id: "local-sess1",
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      enrollmentIds: [localEnrollmentId],
    };
    expect(
      findDuplicateSession(
        local,
        serverSessions,
        enrollmentIdMap,
        localEnrollments,
        serverEnrollments,
        studentIdMap,
        subjectIdMap
      )
    ).toEqual(serverSessions[0]);
  });

  it("시작 시간이 다르면 null을 반환한다", () => {
    const local: Session = {
      id: "local-sess2",
      weekday: 1,
      startsAt: "10:00", // 다른 시간
      endsAt: "11:00",
      enrollmentIds: [localEnrollmentId],
    };
    expect(
      findDuplicateSession(
        local,
        serverSessions,
        enrollmentIdMap,
        localEnrollments,
        serverEnrollments,
        studentIdMap,
        subjectIdMap
      )
    ).toBeNull();
  });

  it("학생이 다르면 null을 반환한다", () => {
    const differentLocalEnrollments: Enrollment[] = [
      { id: localEnrollmentId, studentId: "other-student", subjectId: localSubjectId },
    ];
    const noStudentMap = new Map([["other-student", "other-srv-student"]]);

    const local: Session = {
      id: "local-sess3",
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      enrollmentIds: [localEnrollmentId],
    };
    expect(
      findDuplicateSession(
        local,
        serverSessions,
        enrollmentIdMap,
        differentLocalEnrollments,
        serverEnrollments,
        noStudentMap,
        subjectIdMap
      )
    ).toBeNull();
  });

  it("enrollmentIds가 비어있으면 null을 반환한다", () => {
    const local: Session = {
      id: "local-sess4",
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      enrollmentIds: [], // 빈 배열
    };
    expect(
      findDuplicateSession(
        local,
        serverSessions,
        enrollmentIdMap,
        localEnrollments,
        serverEnrollments,
        studentIdMap,
        subjectIdMap
      )
    ).toBeNull();
  });

  it("enrollmentIds가 undefined이면 null을 반환한다", () => {
    const local: Session = {
      id: "local-sess5",
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      // enrollmentIds 없음
    };
    expect(
      findDuplicateSession(
        local,
        serverSessions,
        enrollmentIdMap,
        localEnrollments,
        serverEnrollments,
        studentIdMap,
        subjectIdMap
      )
    ).toBeNull();
  });
});
