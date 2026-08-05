import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Heading1, 
  Heading2, 
  Link as LinkIcon,
  Code,
  Strikethrough,
  CheckSquare
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...',
      }),
      Link.configure({
        openOnClick: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      // Get markdown output
      const markdown = (editor.storage as any).markdown.getMarkdown();
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[250px] p-6 text-on-surface',
      },
    },
  });

  // Update editor content when content prop changes externally
  useEffect(() => {
    if (editor && content !== (editor.storage as any).markdown.getMarkdown()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

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
    <div className="w-full bg-surface-container-low/50 rounded-2xl border border-outline-variant/10 overflow-hidden focus-within:ring-2 focus-within:ring-primary/10 transition-all">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 p-2 border-b border-outline-variant/5 bg-surface-container-low/30">
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          icon={<Heading1 size={16} />}
          title="Heading 1"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          icon={<Heading2 size={16} />}
          title="Heading 2"
        />
        <div className="w-px h-4 bg-outline-variant/20 mx-1" />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          icon={<Bold size={16} />}
          title="Bold"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          icon={<Italic size={16} />}
          title="Italic"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          icon={<Strikethrough size={16} />}
          title="Strikethrough"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          icon={<Code size={16} />}
          title="Code"
        />
        <div className="w-px h-4 bg-outline-variant/20 mx-1" />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          icon={<List size={16} />}
          title="Bullet List"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          icon={<ListOrdered size={16} />}
          title="Ordered List"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
          icon={<CheckSquare size={16} />}
          title="Task List"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          icon={<Quote size={16} />}
          title="Blockquote"
        />
        <div className="w-px h-4 bg-outline-variant/20 mx-1" />
        <ToolbarButton 
          onClick={setLink}
          active={editor.isActive('link')}
          icon={<LinkIcon size={16} />}
          title="Add Link"
        />
      </div>

      <EditorContent editor={editor} />
      
      <div className="px-4 py-2 bg-surface-container-low/20 border-t border-outline-variant/5 flex items-center justify-between">
        <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
          Tip: Use Markdown shortcuts like # or - for quick formatting.
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Live Editor</span>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, active, icon, title }: { onClick: () => void, active: boolean, icon: React.ReactNode, title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-all ${
        active 
          ? 'bg-primary/10 text-primary shadow-sm' 
          : 'text-on-surface-variant/60 hover:bg-surface-container-high hover:text-on-surface'
      }`}
    >
      {icon}
    </button>
  );
}
