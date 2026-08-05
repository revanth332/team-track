import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Unlink,
  Heading1,
  Heading2,
  Quote
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-outline-variant/10 bg-surface-container-low/50 sticky top-0 z-10 shrink-0">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <div className="w-px h-4 bg-outline-variant/20 mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1.5 rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
        title="Heading 1"
      >
        <Heading1 size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </button>
      <div className="w-px h-4 bg-outline-variant/20 mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
        title="Ordered List"
      >
        <ListOrdered size={16} />
      </button>
      <div className="w-px h-4 bg-outline-variant/20 mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded-lg transition-colors ${editor.isActive('blockquote') ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
        title="Quote"
      >
        <Quote size={16} />
      </button>
      <button
        type="button"
        onClick={setLink}
        className={`p-1.5 rounded-lg transition-colors ${editor.isActive('link') ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
        title="Add Link"
      >
        <LinkIcon size={16} />
      </button>
      {editor.isActive('link') && (
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"
          title="Remove Link"
        >
          <Unlink size={16} />
        </button>
      )}
    </div>
  );
};

export default function RichTextEditor({ value, onChange, placeholder = 'Write something...' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-4 text-on-surface font-medium selection:bg-primary/20',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when value prop changes externally (e.g. form reset or initial load)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="w-full bg-white border border-outline-variant/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/10 transition-all">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
