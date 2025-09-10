export interface Student {
  id: string;
  name: string;
  gender: "male" | "female";
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  subjectId: string;
  startsAt: Date;
  endsAt: Date;
  enrollmentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Enrollment {
  id: string;
  studentId: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}
