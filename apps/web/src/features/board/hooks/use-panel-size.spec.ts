import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { clampSize, usePanelSize } from './use-panel-size';

const key = (k: string, shiftKey = false) =>
  ({
    key: k,
    shiftKey,
    preventDefault: jest.fn(),
  }) as unknown as KeyboardEvent<HTMLElement>;

const pointer = (clientX: number, clientY = 0) =>
  ({
    clientX,
    clientY,
    pointerId: 1,
    preventDefault: jest.fn(),
    currentTarget: { setPointerCapture: jest.fn() },
  }) as unknown as PointerEvent<HTMLElement>;

describe('clampSize', () => {
  it('keeps a size inside its bounds and rounds it', () => {
    expect(clampSize(10, 72, 480)).toBe(72);
    expect(clampSize(999, 72, 480)).toBe(480);
    expect(clampSize(200.6, 72, 480)).toBe(201);
  });
});

describe('usePanelSize', () => {
  const left = {
    initial: 320,
    min: 240,
    max: 440,
    axis: 'x',
    direction: 1,
  } as const;

  it('grows with the arrow away from the panel, by bigger steps with Shift', () => {
    const { result } = renderHook(() => usePanelSize(left));

    act(() => result.current.separator.onKeyDown(key('ArrowRight')));
    expect(result.current.size).toBe(336);

    act(() => result.current.separator.onKeyDown(key('ArrowLeft', true)));
    expect(result.current.size).toBe(288);
  });

  it('jumps to the ends with Home and End', () => {
    const { result } = renderHook(() => usePanelSize(left));

    act(() => result.current.separator.onKeyDown(key('End')));
    expect(result.current.size).toBe(440);
    act(() => result.current.separator.onKeyDown(key('Home')));
    expect(result.current.size).toBe(240);
  });

  it('follows a drag, inverted for a panel on the far side', () => {
    const right = { ...left, direction: -1 } as const;
    const { result } = renderHook(() => usePanelSize(right));

    act(() => result.current.separator.onPointerDown(pointer(1000)));
    act(() => result.current.separator.onPointerMove(pointer(960)));
    expect(result.current.size).toBe(360);

    act(() => result.current.separator.onPointerUp(pointer(960)));
    act(() => result.current.separator.onPointerMove(pointer(900)));
    expect(result.current.size).toBe(360);
  });

  it('reports itself as a splitter with its value and bounds', () => {
    const { result } = renderHook(() => usePanelSize(left));

    expect(result.current.separator).toMatchObject({
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-valuenow': 320,
      'aria-valuemin': 240,
      'aria-valuemax': 440,
    });
  });
});
