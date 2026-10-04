'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@squadup.in/ui';

/* CodeMirror is client-only and sizeable; load it with the room, not the app. */
const LazyCodeEditor = dynamic(() => import('./CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner label="Loading the editor" />
    </div>
  ),
});

export default LazyCodeEditor;
