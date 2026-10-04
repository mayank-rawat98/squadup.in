import { act, renderHook } from '@testing-library/react';
import * as Y from 'yjs';
import {
  readSharedFiles,
  sharedFilesOf,
  useSharedProject,
} from './use-shared-project';

function projectDoc(files: Record<string, string>): Y.Doc {
  const doc = new Y.Doc();
  const map = sharedFilesOf(doc);
  for (const [path, code] of Object.entries(files)) {
    map.set(path, new Y.Text(code));
  }
  return doc;
}

/** A second person's copy of the document, kept in step both ways. */
function peerOf(doc: Y.Doc): Y.Doc {
  const peer = new Y.Doc();
  Y.applyUpdate(peer, Y.encodeStateAsUpdate(doc));
  doc.on('update', (update: Uint8Array) => Y.applyUpdate(peer, update));
  return peer;
}

describe('useSharedProject', () => {
  it('opens App.tsx first and lists every file', () => {
    const doc = projectDoc({ '/index.html': 'html', '/src/App.tsx': 'app' });

    const { result } = renderHook(() => useSharedProject(doc));

    expect(result.current.activeFile).toBe('/src/App.tsx');
    expect(result.current.files).toEqual({
      '/index.html': 'html',
      '/src/App.tsx': 'app',
    });
  });

  it("shows another person's edits as they arrive", () => {
    const doc = projectDoc({ '/src/App.tsx': 'app' });
    const { result } = renderHook(() => useSharedProject(doc));

    act(() => sharedFilesOf(doc).get('/src/App.tsx')?.insert(0, '// hi\n'));

    expect(result.current.files['/src/App.tsx']).toBe('// hi\napp');
  });

  it('adds and deletes files for the whole room', () => {
    const doc = projectDoc({ '/src/App.tsx': 'app' });
    const peer = peerOf(doc);
    const { result } = renderHook(() => useSharedProject(doc));

    act(() => result.current.addFiles({ '/src/Card.tsx': 'card' }));
    act(() => result.current.deleteFile('/src/App.tsx'));

    expect(readSharedFiles(peer)).toEqual({ '/src/Card.tsx': 'card' });
  });

  it('replaces a whole file in place, as the Packages panel does', () => {
    const doc = projectDoc({ '/package.json': '{}' });
    const text = sharedFilesOf(doc).get('/package.json');
    const { result } = renderHook(() => useSharedProject(doc));

    act(() => result.current.updateFile('/package.json', '{"a":1}'));

    expect(sharedFilesOf(doc).get('/package.json')).toBe(text);
    expect(text?.toString()).toBe('{"a":1}');
  });

  it('moves you to App.tsx when someone deletes the file you have open', () => {
    const doc = projectDoc({ '/src/App.tsx': 'app', '/src/Card.tsx': 'card' });
    const { result } = renderHook(() => useSharedProject(doc));
    act(() => result.current.openFile('/src/Card.tsx'));
    expect(result.current.activeFile).toBe('/src/Card.tsx');

    act(() => sharedFilesOf(doc).delete('/src/Card.tsx'));

    expect(result.current.activeFile).toBe('/src/App.tsx');
  });

  it('keeps which file is open to yourself', () => {
    const doc = projectDoc({ '/src/App.tsx': 'app', '/src/Card.tsx': 'card' });
    const before = Y.encodeStateVector(doc);
    const { result } = renderHook(() => useSharedProject(doc));

    act(() => result.current.openFile('/src/Card.tsx'));

    expect(Y.encodeStateVector(doc)).toEqual(before);
  });
});
