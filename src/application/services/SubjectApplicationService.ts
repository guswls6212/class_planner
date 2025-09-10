import { Subject } from "@/entities";
import { SubjectRepository } from "@/infrastructure/interfaces";

export class SubjectApplicationServiceImpl {
  constructor(private subjectRepository: SubjectRepository) {}

  async getAllSubjects(): Promise<Subject[]> {
    return this.subjectRepository.getAll();
  }

  async getSubjectById(id: string): Promise<Subject | null> {
    return this.subjectRepository.getById(id);
  }

  async addSubject(subjectData: {
    name: string;
    color: string;
  }): Promise<Subject> {
    return this.subjectRepository.create(subjectData);
  }

  async updateSubject(
    id: string,
    subjectData: { name: string; color: string }
  ): Promise<Subject> {
    return this.subjectRepository.update(id, subjectData);
  }

  async deleteSubject(id: string): Promise<void> {
    return this.subjectRepository.delete(id);
  }
}
