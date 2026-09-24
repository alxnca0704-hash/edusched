"use client";

import { useId, useState, type FormEvent } from "react";
import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROOM_TYPE_LABELS } from "@/constants/rooms";
import { errorMessage } from "@/lib/result";
import { subjectFormSchema } from "@/lib/validation/subject";
import type {
  SubjectFormValues,
  SubjectListItem,
  TeacherOption,
} from "@/types/subjects";
import type { Room } from "@/types/rooms";

export interface SubjectFormDialogProps {
  subject?: SubjectListItem;
  teachers: TeacherOption[];
  rooms: Room[];
  onSubmit: (values: SubjectFormValues) => Promise<void>;
  onClose: () => void;
}

type FieldErrors = Partial<Record<keyof SubjectFormValues, string>>;

export function SubjectFormDialog({
  subject,
  teachers,
  rooms,
  onSubmit,
  onClose,
}: SubjectFormDialogProps) {
  const formId = useId();
  const [name, setName] = useState(subject?.name ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    subject ? String(subject.durationMinutes) : "",
  );
  const [meetingsPerWeek, setMeetingsPerWeek] = useState(
    subject ? String(subject.meetingsPerWeek) : "",
  );
  const [roomId, setRoomId] = useState<string | null>(subject?.roomId ?? null);
  const [teacherId, setTeacherId] = useState<string | null>(
    subject?.teacherId ?? null,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(subject);
  const noTeachers = teachers.length === 0;
  const noRooms = rooms.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = subjectFormSchema.safeParse({
      name,
      durationMinutes,
      meetingsPerWeek,
      roomId: roomId ?? "",
      teacherId: teacherId ?? "",
    });

    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const [key, messages] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
        if (messages?.[0]) {
          errors[key as keyof SubjectFormValues] = messages[0];
        }
      }
      setFieldErrors(errors);
      setSubmitError(null);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setSubmitting(true);

    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit subject" : "Add subject"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the subject's details below."
              : "Add a new subject to the schedule."}
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-name`}>Subject name</Label>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Mathematics"
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name ? (
              <p className="text-xs text-destructive">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-duration`}>Duration (minutes)</Label>
              <Input
                id={`${formId}-duration`}
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                placeholder="60"
                aria-invalid={Boolean(fieldErrors.durationMinutes)}
              />
              {fieldErrors.durationMinutes ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.durationMinutes}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-meetings`}>Meetings / week</Label>
              <Input
                id={`${formId}-meetings`}
                type="number"
                min={1}
                max={10}
                value={meetingsPerWeek}
                onChange={(event) => setMeetingsPerWeek(event.target.value)}
                placeholder="2"
                aria-invalid={Boolean(fieldErrors.meetingsPerWeek)}
              />
              {fieldErrors.meetingsPerWeek ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.meetingsPerWeek}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Room</Label>
            <Select
              value={roomId}
              onValueChange={setRoomId}
              modal={false}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => {
                    const room = rooms.find((r) => r._id === value);
                    return room ? (
                      `${room.name} (${ROOM_TYPE_LABELS[room.type]})`
                    ) : noRooms ? (
                      "No rooms available"
                    ) : (
                      "Select a room"
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room._id} value={room._id}>
                    {room.name} ({ROOM_TYPE_LABELS[room.type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.roomId ? (
              <p className="text-xs text-destructive">{fieldErrors.roomId}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>Assigned teacher</Label>
            <Select
              value={teacherId}
              onValueChange={setTeacherId}
              modal={false}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => {
                    const teacher = teachers.find((t) => t.clerkId === value);
                    return (
                      teacher?.name ??
                      (noTeachers
                        ? "No teachers available"
                        : "Select a teacher")
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.clerkId} value={teacher.clerkId}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.teacherId ? (
              <p className="text-xs text-destructive">{fieldErrors.teacherId}</p>
            ) : null}
          </div>

          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {isEditing ? <Save /> : <Plus />}
            {isEditing ? "Save changes" : "Add subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}