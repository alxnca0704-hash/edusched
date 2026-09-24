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
import { ROOM_TYPE_LABELS, ROOM_TYPES } from "@/constants/subjects";
import { errorMessage } from "@/lib/result";
import { subjectFormSchema } from "@/lib/validation/subject";
import type {
  RoomType,
  SubjectFormValues,
  SubjectListItem,
  TeacherOption,
} from "@/types/subjects";

export interface SubjectFormDialogProps {
  subject?: SubjectListItem;
  teachers: TeacherOption[];
  onSubmit: (values: SubjectFormValues) => Promise<void>;
  onClose: () => void;
}

type FieldErrors = Partial<Record<keyof SubjectFormValues, string>>;

export function SubjectFormDialog({
  subject,
  teachers,
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
  const [roomType, setRoomType] = useState<RoomType | null>(
    subject?.roomType ?? null,
  );
  const [teacherId, setTeacherId] = useState<string | null>(
    subject?.teacherId ?? null,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(subject);
  const noTeachers = teachers.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = subjectFormSchema.safeParse({
      name,
      durationMinutes,
      meetingsPerWeek,
      roomType: roomType ?? "",
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
            <Label>Category / room type</Label>
            <Select
              value={roomType}
              onValueChange={(value) =>
                setRoomType(value as RoomType | null)
              }
              modal={false}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) =>
                    value
                      ? ROOM_TYPE_LABELS[value as RoomType]
                      : "Select a room type"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ROOM_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.roomType ? (
              <p className="text-xs text-destructive">{fieldErrors.roomType}</p>
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