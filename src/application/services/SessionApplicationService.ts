import { Session } from "@/entities";
import { SessionRepository } from "@/infrastructure/interfaces";

export class SessionApplicationServiceImpl {
  constructor(private sessionRepository: SessionRepository) {}

  async getAllSessions(): Promise<Session[]> {
    return this.sessionRepository.getAll();
  }

  async getSessionById(id: string): Promise<Session | null> {
    return this.sessionRepository.getById(id);
  }

  async addSession(sessionData: {
    subjectId: string;
    startsAt: Date;
    endsAt: Date;
    enrollmentIds: string[];
  }): Promise<Session> {
    return this.sessionRepository.create(sessionData);
  }

  async updateSession(
    id: string,
    sessionData: {
      subjectId: string;
      startsAt: Date;
      endsAt: Date;
      enrollmentIds: string[];
    }
  ): Promise<Session> {
    return this.sessionRepository.update(id, sessionData);
  }

  async deleteSession(id: string): Promise<void> {
    return this.sessionRepository.delete(id);
  }
}
