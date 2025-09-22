import { Session } from "@/shared/types/DomainTypes";
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
    weekday: number;
  }): Promise<Session> {
    const sessionToCreate = {
      ...sessionData,
      startsAt: sessionData.startsAt.toISOString().substring(11, 16), // HH:MM 형식
      endsAt: sessionData.endsAt.toISOString().substring(11, 16), // HH:MM 형식
    };
    return this.sessionRepository.create(sessionToCreate);
  }

  async updateSession(
    id: string,
    sessionData: {
      subjectId: string;
      startsAt: Date;
      endsAt: Date;
      enrollmentIds: string[];
      weekday: number;
      room?: string;
    }
  ): Promise<Session> {
    const sessionToUpdate = {
      ...sessionData,
      startsAt: sessionData.startsAt.toISOString().substring(11, 16), // HH:MM 형식
      endsAt: sessionData.endsAt.toISOString().substring(11, 16), // HH:MM 형식
    };
    return this.sessionRepository.update(id, sessionToUpdate);
  }

  async updateSessionPosition(
    id: string,
    position: { weekday: number; startsAt: Date; endsAt: Date; yPosition?: number }
  ): Promise<Session> {
    const session = await this.sessionRepository.getById(id);
    if (!session) {
      throw new Error("Session not found");
    }
    
    return this.sessionRepository.update(id, {
      ...session,
      weekday: position.weekday,
      startsAt: position.startsAt.toISOString().substring(11, 16), // HH:MM 형식
      endsAt: position.endsAt.toISOString().substring(11, 16), // HH:MM 형식
      yPosition: position.yPosition,
    });
  }

  async deleteSession(id: string): Promise<void> {
    return this.sessionRepository.delete(id);
  }
}
