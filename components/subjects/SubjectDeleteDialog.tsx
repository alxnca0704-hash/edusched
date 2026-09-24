"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { errorMessage } from "@/lib/result";
import type { SubjectListItem } from "@/types/subjects";

export interface SubjectDeleteDialogProps {
  subject: SubjectListItem;
  onConfirm: (id: string) => Promise<void>;
  onClose: () => void;
}

export function SubjectDeleteDialog({
  subject,
  onConfirm,
  onClose,
}: SubjectDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);

    try {
      await onConfirm(subject._id);
    } catch (deleteError) {
      setError(errorMessage(deleteError));
      setDeleting(false);
      return;
    }

    setDeleting(false);
    onClose();
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {subject.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the subject from scheduling. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            Delete subject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}