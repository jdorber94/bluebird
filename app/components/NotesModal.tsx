import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import RichTextEditor from "./RichTextEditor"

interface NotesModalProps {
  isOpen: boolean
  onClose: () => void
  notes: string
  onSave: (notes: string) => void
  demoTitle: string
}

const NotesModal = ({ isOpen, onClose, notes, onSave, demoTitle }: NotesModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Notes for {demoTitle}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <RichTextEditor
            content={notes}
            onChange={onSave}
            className="min-h-[300px]"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NotesModal 