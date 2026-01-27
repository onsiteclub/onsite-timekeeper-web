// components/DeleteConfirmModal.tsx
'use client';

import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedDayCount: number;
  totalEntryCount: number;
  isDeleting: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  selectedDayCount,
  totalEntryCount,
  isDeleting,
}: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Entries" size="sm">
      <div className="space-y-4">
        <p className="text-text-secondary">
          Are you sure you want to delete all entries for{' '}
          <span className="font-semibold text-text-primary">
            {selectedDayCount} day{selectedDayCount !== 1 ? 's' : ''}
          </span>
          ? This will remove{' '}
          <span className="font-semibold text-text-primary">
            {totalEntryCount} time entr{totalEntryCount !== 1 ? 'ies' : 'y'}
          </span>
          .
        </p>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
