import { Session } from "@/shared/types/DomainTypes";
import { SessionRepository } from "@/infrastructure/interfaces";
import { AppError } from "@/lib/errors/AppError";

export class SessionApplicationServiceImpl {
  constructor(private sessionRepository: SessionRepository) {}

  async getAllSessions(academyId: string, opts?: { weekStartDate?: string }): Promise<Session[]> {
    return this.sessionRepository.getAll(academyId, opts);
  }

  async getSessionById(id: string, academyId?: string): Promise<Session | null> {
    return this.sessionRepository.getById(id, academyId);
  }

  async addSession(
    sessionData: {
      subjectId: string;
      startsAt: string;
      endsAt: string;
      enrollmentIds: string[];
      weekday: number;
      weekStartDate?: string;
      teacherId?: string | null;
      public_description?: string | null;
      internal_note?: string | null;
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
      teacherId?: string | null;
      public_description?: string | null;
      internal_note?: string | null;
    },
    academyId?: string
  ): Promise<Session> {
    return this.sessionRepository.update(id, sessionData, academyId);
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

  async deleteSession(id: string, academyId?: string): Promise<void> {
    return this.sessionRepository.delete(id, academyId);
  }
}
