'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const CkEditorField = dynamic(() => import('./ck-editor'), { ssr: false, loading: () => <p className="split-note">Loading editor…</p> });

export function RichText({ name, initial = '' }: { name: string; initial?: string }) {
  const [value, setValue] = useState(initial);
  const words = value.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return <div className="rich-text"><CkEditorField initial={initial} onChange={setValue} /><input type="hidden" name={name} value={value} /><small>{words} words</small></div>;
}
