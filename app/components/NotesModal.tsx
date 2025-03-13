"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/ui/dialog"
import RichTextEditor from "./RichTextEditor"
import { useEffect, useState } from "react"

interface NotesModalProps {
  isOpen: boolean
  onClose: () => void
  notes: string
  onSave: (notes: string) => void
  demoTitle: string
}

const NotesModal = ({ isOpen, onClose, notes, onSave, demoTitle }: NotesModalProps) => {
  const [localNotes, setLocalNotes] = useState(notes)
  const [saveStatus, setSaveStatus] = useState("")

  useEffect(() => {
    setLocalNotes(notes)
  }, [notes])

  const handleChange = (content: string) => {
    setLocalNotes(content)
    // Auto-save after a short delay
    setSaveStatus("Saving...")
    const timeoutId = setTimeout(() => {
      onSave(content)
      setSaveStatus("Saved")
      setTimeout(() => setSaveStatus(""), 2000)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center justify-between text-xl text-slate-900">
            <span className="font-semibold">Notes for {demoTitle}</span>
            {saveStatus && (
              <span className="text-sm font-normal text-slate-600">{saveStatus}</span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 bg-slate-50 rounded-lg">
          <RichTextEditor
            content={localNotes}
            onChange={handleChange}
            className="min-h-[300px]"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NotesModal 