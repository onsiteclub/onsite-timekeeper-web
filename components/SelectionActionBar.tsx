// components/SelectionActionBar.tsx
'use client';

interface SelectionActionBarProps {
  selectedCount: number;
  onShare: () => void;
  onExport: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onCancel: () => void;
  canEdit: boolean;
}

export function SelectionActionBar({
  selectedCount,
  onShare,
  onExport,
  onDelete,
  onEdit,
  onCancel,
  canEdit,
}: SelectionActionBarProps) {
  return (
    <div className="fixed bottom-20 md:bottom-4 left-0 right-0 z-[60] px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-3">
        {/* Top row: count + cancel */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-primary">
            {selectedCount} day{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onCancel}
            className="text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Share */}
          <button
            onClick={onShare}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-gray-100 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span className="text-xs font-medium text-text-secondary">Share</span>
          </button>

          {/* Export */}
          <button
            onClick={onExport}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-gray-100 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="text-xs font-medium text-text-secondary">Export</span>
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            disabled={!canEdit}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
              canEdit ? 'hover:bg-gray-100' : 'opacity-40'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span className="text-xs font-medium text-text-secondary">Edit</span>
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-red-50 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span className="text-xs font-medium text-error">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
