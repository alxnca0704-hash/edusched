export type RoomType = "lecture" | "lab";

export interface Subject {
  _id: string;
  name: string;
  durationMinutes: number;
  meetingsPerWeek: number;
  roomType: RoomType;
  teacherId: string;
  createdAt: number;
  updatedAt: number;
}

export interface SubjectListItem extends Subject {
  teacherName: string;
}

export interface SubjectFormValues {
  name: string;
  durationMinutes: number;
  meetingsPerWeek: number;
  roomType: RoomType;
  teacherId: string;
}

export interface TeacherOption {
  clerkId: string;
  name: string;
}