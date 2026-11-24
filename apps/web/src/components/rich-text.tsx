'use client';

import { useState } from 'react';

const commands = [['bold', 'B'], ['italic', 'I'], ['underline', 'U'], ['insertUnorderedList', '•'], ['insertOrderedList', '1.']] as const;

export function RichText({ name, initial = '' }: { name: string; initial?: string }) {
  const [value, setValue] = useState(initial);
  return <div className="rich-text"><div className="rich-toolbar">{commands.map(([command, label]) => <button key={command} type="button" onClick={() => document.execCommand(command)}>{label}</button>)}</div><div className="rich-area" contentEditable role="textbox" aria-multiline="true" suppressContentEditableWarning onInput={(event) => setValue(event.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: initial }} /><input type="hidden" name={name} value={value} /><small>{value.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length} words</small></div>;
}
