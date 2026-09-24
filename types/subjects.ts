import type { RoomType } from "@/types/rooms";

export interface Subject {
  _id: string;
  name: string;
  durationMinutes: number;
  roomId: string;
  teacherId: string;
  createdAt: number;
  updatedAt: number;
}

export interface SubjectListItem extends Subject {
  roomName: string;
  roomType: RoomType;
  teacherName: string;
}

export interface SubjectFormValues {
  name: string;
  durationMinutes: number;
  roomId: string;
  teacherId: string;
}

export interface TeacherOption {
  clerkId: string;
  name: string;
}