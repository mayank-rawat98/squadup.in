import { TextEncoder as NodeTextEncoder } from 'node:util';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { updateSandbox } from '../api/sandboxes.api';
import {
  SANDBOX_AUTOSAVE_DELAY_MS,
  SANDBOX_MAX_TOTAL_BYTES,
} from '../constants/sandbox.constant';
import type { SandboxFiles } from '../types/sandbox.types';
import { saveStatusOf, useAutosave } from './use-autosave';

jest.mock('../api/sandboxes.api', () => ({ updateSandbox: jest.fn() }));

const updateMock = jest.mocked(updateSandbox);

const SUMMARY = {
  id: 's1',
  name: 'Todo app',
  createdAt: '2026-10-04T10:00:00.000Z',
  updatedAt: '2026-10-04T10:05:00.000Z',
};

// jsdom has no TextEncoder; projectSize needs one.
beforeAll(() => {
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder });
});

function setup(initial: SandboxFiles) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(({ files }) => useAutosave('s1', files), {
    initialProps: { files: initial },
    wrapper,
  });
}

/** Runs the timers and lets the save's promise settle. */
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe('useAutosave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    updateMock.mockReset().mockResolvedValue(SUMMARY);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts saved and does not save the project it opened with', async () => {
    const { result } = setup({ '/App.tsx': 'a' });

    await advance(SANDBOX_AUTOSAVE_DELAY_MS * 2);

    expect(result.current.status).toBe('saved');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('saves once, after typing stops', async () => {
    const { result, rerender } = setup({ '/App.tsx': 'a' });

    rerender({ files: { '/App.tsx': 'ab' } });
    expect(result.current.status).toBe('unsaved');
    await advance(SANDBOX_AUTOSAVE_DELAY_MS - 1);
    rerender({ files: { '/App.tsx': 'abc' } });
    await advance(SANDBOX_AUTOSAVE_DELAY_MS - 1);
    expect(updateMock).not.toHaveBeenCalled();

    await advance(1);

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith('s1', {
      files: { '/App.tsx': 'abc' },
    });
    expect(result.current.status).toBe('saved');
  });

  it('does not retry a failed save until asked', async () => {
    updateMock.mockRejectedValueOnce(new Error('Server error'));
    const { result, rerender } = setup({ '/App.tsx': 'a' });

    rerender({ files: { '/App.tsx': 'ab' } });
    await advance(SANDBOX_AUTOSAVE_DELAY_MS);
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('Server error');

    await advance(SANDBOX_AUTOSAVE_DELAY_MS * 3);
    expect(updateMock).toHaveBeenCalledTimes(1);

    act(() => result.current.retry());
    await advance(SANDBOX_AUTOSAVE_DELAY_MS);

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('saved');
  });

  it('holds a project that is over the size limit', async () => {
    const { result, rerender } = setup({ '/App.tsx': 'a' });

    rerender({
      files: { '/App.tsx': 'a'.repeat(SANDBOX_MAX_TOTAL_BYTES + 1) },
    });
    await advance(SANDBOX_AUTOSAVE_DELAY_MS * 2);

    expect(result.current.status).toBe('too-large');
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('saveStatusOf', () => {
  const base = { dirty: true, saving: false, failed: false, tooLarge: false };

  it('reports saving over everything else', () => {
    expect(saveStatusOf({ ...base, saving: true, failed: true })).toBe(
      'saving',
    );
  });

  it('is saved when nothing changed', () => {
    expect(saveStatusOf({ ...base, dirty: false, tooLarge: true })).toBe(
      'saved',
    );
  });
});
