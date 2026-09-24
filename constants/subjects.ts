import type { RoomType } from "@/types/subjects";

export const ROOM_TYPES = ["lecture", "lab"] as const satisfies readonly RoomType[];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  lecture: "Lecture",
  lab: "Lab",
};