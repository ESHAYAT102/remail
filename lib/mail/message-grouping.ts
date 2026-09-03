import type { Message } from "./types";

export const NEARBY_SENDER_WINDOW_MS = 30 * 60 * 1000;

export type MessageSpacing = "default" | "compact" | "separated";

type GroupableMessage = Pick<Message, "date" | "from">;

export function messageSpacing(
  previous: GroupableMessage | undefined,
  current: GroupableMessage,
): MessageSpacing {
  if (!previous) return "default";

  const previousDate = new Date(previous.date);
  const currentDate = new Date(current.date);
  if (!sameLocalDay(previousDate, currentDate)) return "separated";

  if (
    previous.from.email.trim().toLowerCase() !==
    current.from.email.trim().toLowerCase()
  ) {
    return "separated";
  }

  const distance = Math.abs(currentDate.getTime() - previousDate.getTime());
  return distance <= NEARBY_SENDER_WINDOW_MS ? "compact" : "default";
}

function sameLocalDay(left: Date, right: Date) {
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
