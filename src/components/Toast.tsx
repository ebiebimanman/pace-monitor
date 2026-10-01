import type { ToastMessage } from '../hooks/useToast'

export function Toast({ toast, onHide }: { toast: ToastMessage | null; onHide: () => void }) {
  if (!toast) return null
  return (
    <div className="toast" role="status">
      <span>{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.()
            onHide()
          }}
        >
          取り消す
        </button>
      )}
    </div>
  )
}
