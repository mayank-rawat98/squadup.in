import * as Y from 'yjs';
import { BOARD_SANDBOX_DOC_FILES } from '../constants/board-socket.constants';
import type { SandboxFiles } from '../../sandboxes/utils/sandbox-files';

/** A room's React project as the first state of its shared document. */
export function encodeSandboxDoc(files: SandboxFiles): Uint8Array {
  const doc = new Y.Doc();
  const map = doc.getMap<Y.Text>(BOARD_SANDBOX_DOC_FILES);
  doc.transact(() => {
    for (const [path, source] of Object.entries(files)) {
      map.set(path, new Y.Text(source));
    }
  });
  const state = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return state;
}
