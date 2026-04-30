import { Session } from "@/shared/types/DomainTypes";
import { SessionRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";

export class SessionApplicationServiceImpl {
  constructor(private sessionRepository: SessionRepository) {}

  async getAllSessions(academyId: string, opts?: { weekStartDate?: string }): Promise<Session[]> {
    return this.sessionRepository.getAll(academyId, opts);
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
      weekStartDate?: string;
    },
    academyId: string
  ): Promise<Session> {
    return this.sessionRepository.create(
      { ...sessionData, weekStartDate: sessionData.weekStartDate ?? "" },
      academyId
    );
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
      throw new AppError("SESSION_NOT_FOUND", { statusHint: 404 });
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
