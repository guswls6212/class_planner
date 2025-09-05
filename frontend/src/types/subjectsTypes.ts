export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface SubjectManagementData {
  subjects: Subject[];
  selectedSubjectId: string;
}

export interface AddSubjectFormData {
  name: string;
  color: string;
}

export interface SubjectActions {
  addSubject: (name: string, color: string) => void;
  deleteSubject: (subjectId: string) => void;
  selectSubject: (subjectId: string) => void;
  updateSubject: (subjectId: string, name: string, color: string) => void;
}

export interface SubjectInitializationData {
  defaultSubjects: Subject[];
}

export interface LocalStorageData {
  subjects: Subject[];
  selectedSubjectId: string;
}
