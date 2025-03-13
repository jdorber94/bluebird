import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Toggle } from "./ui/toggle"
import { Bold, Italic, List, ListOrdered } from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  className?: string
  compact?: boolean
}

const RichTextEditor = ({ content, onChange, className, compact = false }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border border-slate-200 bg-white", className)}>
      {!compact && (
        <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 p-2 rounded-t-lg">
          <Toggle
            size="sm"
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            className="hover:bg-slate-200 data-[state=on]:bg-slate-200 data-[state=on]:text-slate-900"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            className="hover:bg-slate-200 data-[state=on]:bg-slate-200 data-[state=on]:text-slate-900"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('bulletList')}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            className="hover:bg-slate-200 data-[state=on]:bg-slate-200 data-[state=on]:text-slate-900"
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive('orderedList')}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            className="hover:bg-slate-200 data-[state=on]:bg-slate-200 data-[state=on]:text-slate-900"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
        </div>
      )}
      <EditorContent 
        editor={editor} 
        className={cn(
          "prose prose-slate prose-sm max-w-none px-4 py-3 focus:outline-none text-slate-900",
          "prose-p:my-1 prose-headings:mb-2 prose-headings:mt-4 prose-headings:text-slate-900",
          "prose-strong:text-slate-900 prose-em:text-slate-800",
          compact && "min-h-[2.5rem]"
        )}
      />
    </div>
  )
}

export default RichTextEditor 