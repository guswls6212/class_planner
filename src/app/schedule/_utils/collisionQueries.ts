import type { Session } from "../../../lib/planner";
import { isTimeOverlapping } from "./collisionHelpers";

export function findCollidingSessionsImpl(
  sessions: Session[],
  weekday: number,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Session[] {
  return sessions.filter((session) => {
    return (
      session.weekday === weekday &&
      session.id !== excludeSessionId &&
      isTimeOverlapping(startTime, endTime, session.startsAt, session.endsAt)
    );
  });
}

type SessionWithPriority = Session & { priorityLevel?: number };

export function checkCollisionsAtYPositionImpl(
  targetDaySessions: Map<number, SessionWithPriority[]>,
  yPosition: number,
  targetStartTime: string,
  targetEndTime: string,
  checkWithPriorityLevel1: boolean = false
): boolean {
  const sessionsAtYPosition = targetDaySessions.get(yPosition) || [];

  const targetList = checkWithPriorityLevel1
    ? sessionsAtYPosition.filter((s) => s.priorityLevel === 1)
    : sessionsAtYPosition;

  return targetList.some((s) =>
    isTimeOverlapping(targetStartTime, targetEndTime, s.startsAt, s.endsAt)
  );
}
