import React, { type ReactNode } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

export type DeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  description?: string;
  children?: ReactNode;
};

const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  title = 'Delete',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  children,
}: DeleteConfirmDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!loading}>
        <div className="flex flex-col items-center text-center gap-2">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 text-red-600 mb-2">
            <AlertTriangle className="w-8 h-8" />
          </span>
          <DialogHeader className="w-full">
            <DialogTitle className="text-xl font-bold text-red-700 mb-1">{title}</DialogTitle>
            <DialogDescription className="text-gray-600 mb-2">
              {children || description}
            </DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter className="mt-4 flex-row gap-2 justify-center">
          <DialogClose asChild disabled={loading}>
            <Button variant="outline" type="button" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            type="button"
            onClick={onConfirm}
            disabled={loading}
            autoFocus
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmDialog; 