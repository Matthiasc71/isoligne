import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { Placeholder } from '@tiptap/extensions';
import type * as Y from 'yjs';
import './editeur.css';

/**
 * Texte riche (TipTap / ProseMirror) lié à un fragment Yjs : titres, gras,
 * italique, listes, citations, code et liens, saisis au clavier en Markdown
 * (« ## », « - », « > », « ** »). Pas de barre de mise en forme : l'écran reste nu.
 */
export default function EditeurRiche({
  fragment, libelle, placeholder = 'Texte', autoFocus = false,
}: {
  fragment: Y.XmlFragment;
  libelle: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const editeur = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false,
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } },
      }),
      Collaboration.configure({ fragment }),
      Placeholder.configure({ placeholder }),
    ],
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: { 'aria-label': libelle, class: 'editeur t-corps', spellcheck: 'true' },
    },
  }, [fragment]);
  return <EditorContent editor={editeur} />;
}
