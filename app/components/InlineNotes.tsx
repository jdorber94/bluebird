import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { Button } from "./ui/button"
import RichTextEditor from "./RichTextEditor"
import NotesModal from "./NotesModal"

interface InlineNotesProps {
  notes: string
  onSave: (notes: string) => void
  demoTitle: string
}

const InlineNotes = ({ notes, onSave, demoTitle }: InlineNotesProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Strip HTML tags for preview
  const getPreviewText = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    const text = div.textContent || div.innerText || ''
    return text.length > 30 ? text.substring(0, 30) + '...' : text
  }

  return (
    <div className="relative flex items-center gap-2">
      {isEditing ? (
        <RichTextEditor
          content={notes}
          onChange={(content) => {
            onSave(content)
            setIsEditing(false)
          }}
          compact
          className="min-w-[200px]"
        />
      ) : (
        <div
          className="min-w-[100px] cursor-pointer text-sm"
          onClick={() => setIsEditing(true)}
        >
          {notes ? getPreviewText(notes) : "Click to add notes..."}
        </div>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => setIsModalOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

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