import { MessageSquare } from "lucide-react"
import { Button } from "./ui/button"
import NotesModal from "./NotesModal"
import { useState } from "react"
import { Tooltip } from "./ui/tooltip"

interface InlineNotesProps {
  notes: string
  onSave: (notes: string) => void
  demoTitle: string
}

const InlineNotes = ({ notes, onSave, demoTitle }: InlineNotesProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Strip HTML tags for preview
  const getPreviewText = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    const text = div.textContent || div.innerText || ''
    return text.length > 15 ? text.substring(0, 15) + '...' : text
  }

  const hasNotes = notes && notes.trim().length > 0
  const tooltipText = hasNotes ? getPreviewText(notes) : 'Add Notes'

  return (
    <div className="flex items-center justify-center">
      <Tooltip content={tooltipText}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setIsModalOpen(true)}
        >
          <MessageSquare 
            className={`h-5 w-5 ${hasNotes ? 'fill-blue-500 text-blue-500' : ''}`} 
          />
        </Button>
      </Tooltip>

      <NotesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notes={notes}
        onSave={onSave}
        demoTitle={demoTitle}
      />
    </div>
  )
}

export default InlineNotes 