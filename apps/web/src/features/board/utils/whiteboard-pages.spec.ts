import * as Y from 'yjs';
import { WHITEBOARD_MAX_PAGES } from '../constants/board.constant';
import {
  addPage,
  countOthersOnPages,
  pageLabel,
  pagesArray,
  readPages,
} from './whiteboard-pages';

describe('readPages', () => {
  it('gives a room from before pages its first page', () => {
    expect(readPages([])).toEqual([{ id: 'main' }]);
  });

  it('keeps the listed order', () => {
    expect(readPages([{ id: 'main' }, { id: 'p2' }, { id: 'p3' }])).toEqual([
      { id: 'main' },
      { id: 'p2' },
      { id: 'p3' },
    ]);
  });

  it('puts the first page in front when only later pages are listed', () => {
    expect(readPages([{ id: 'p2' }])).toEqual([{ id: 'main' }, { id: 'p2' }]);
  });

  it('shows a page listed twice once, and skips anything that is not a page', () => {
    expect(
      readPages([{ id: 'main' }, { id: 'main' }, null, { title: 'x' }, 7]),
    ).toEqual([{ id: 'main' }]);
  });
});

describe('addPage', () => {
  it('adds a page after the existing ones', () => {
    const doc = new Y.Doc();
    pagesArray(doc).push([{ id: 'main' }]);

    expect(addPage(doc, 'p2')).toEqual({ id: 'p2' });
    expect(pagesArray(doc).toArray()).toEqual([{ id: 'main' }, { id: 'p2' }]);
  });

  it('lists the first page too in a room from before pages', () => {
    const doc = new Y.Doc();

    addPage(doc, 'p2');

    expect(pagesArray(doc).toArray()).toEqual([{ id: 'main' }, { id: 'p2' }]);
  });

  it('refuses a page past the limit', () => {
    const doc = new Y.Doc();
    for (let i = 1; i < WHITEBOARD_MAX_PAGES; i++) addPage(doc, `p${i}`);

    expect(readPages(pagesArray(doc).toArray())).toHaveLength(
      WHITEBOARD_MAX_PAGES,
    );
    expect(addPage(doc, 'one-too-many')).toBeNull();
    expect(readPages(pagesArray(doc).toArray())).toHaveLength(
      WHITEBOARD_MAX_PAGES,
    );
  });

  it('keeps both pages when two people add one at the same time', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    addPage(a, 'from-a');
    addPage(b, 'from-b');

    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));

    const ids = readPages(pagesArray(a).toArray()).map((p) => p.id);
    expect(ids[0]).toBe('main');
    expect([...ids].sort()).toEqual(['from-a', 'from-b', 'main']);
  });
});

describe('pageLabel', () => {
  it('numbers pages from 1', () => {
    expect(pageLabel(0)).toBe('Page 1');
    expect(pageLabel(2)).toBe('Page 3');
  });
});

describe('countOthersOnPages', () => {
  const peer = (id: string, view: string, page?: string) => ({
    user: { id },
    view,
    page,
  });

  it('counts each person once per page, only while they are on the whiteboard', () => {
    expect(
      countOthersOnPages(
        [
          peer('u1', 'board', 'p2'),
          peer('u1', 'board', 'p2'),
          peer('u2', 'board'),
          peer('u3', 'code', 'p2'),
        ],
        'you',
      ),
    ).toEqual({ p2: 1, main: 1 });
  });

  it('leaves out your own other tabs', () => {
    expect(countOthersOnPages([peer('you', 'board', 'p2')], 'you')).toEqual({});
  });
});
