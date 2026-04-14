import { Session } from "@/shared/types/DomainTypes";
import { SessionRepository } from "@/infrastructure/interfaces";

export class SessionApplicationServiceImpl {
  constructor(private sessionRepository: SessionRepository) {}

  async getAllSessions(academyId: string): Promise<Session[]> {
    return this.sessionRepository.getAll(academyId);
  }

  async getSessionById(id: string): Promise<Session | null> {
    return this.sessionRepository.getById(id);
  }

  async addSession(
    sessionData: {
      subjectId: string;
      startsAt: string;
      endsAt: string;
      enrollmentIds: string[];
      weekday: number;
    },
    academyId: string
  ): Promise<Session> {
    return this.sessionRepository.create(sessionData, academyId);
  }

  async updateSession(
    id: string,
    sessionData: {
      subjectId: string;
      startsAt: string;
      endsAt: string;
      enrollmentIds: string[];
      weekday: number;
      room?: string;
    }
  ): Promise<Session> {
    return this.sessionRepository.update(id, sessionData);
  }

  async updateSessionPosition(
    id: string,
    position: { weekday: number; startsAt: string; endsAt: string; yPosition?: number }
  ): Promise<Session> {
    const session = await this.sessionRepository.getById(id);
    if (!session) {
      throw new Error("Session not found");
    }

    return this.sessionRepository.update(id, {
      ...session,
      weekday: position.weekday,
      startsAt: position.startsAt,
      endsAt: position.endsAt,
      yPosition: position.yPosition,
    });
  }

  async deleteSession(id: string): Promise<void> {
    return this.sessionRepository.delete(id);
  }
}
