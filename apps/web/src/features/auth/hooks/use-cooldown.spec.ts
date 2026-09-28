import { act, renderHook } from '@testing-library/react';
import { useCooldown } from './use-cooldown';

describe('useCooldown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is inactive until started', () => {
    const { result } = renderHook(() => useCooldown(60));
    expect(result.current).toMatchObject({ remaining: 0, active: false });
  });

  it('counts down from the full wait and ends on time', () => {
    const { result } = renderHook(() => useCooldown(60));

    act(() => result.current.start());
    expect(result.current).toMatchObject({ remaining: 60, active: true });

    act(() => jest.advanceTimersByTime(59_000));
    expect(result.current.remaining).toBe(1);

    act(() => jest.advanceTimersByTime(1_000));
    expect(result.current).toMatchObject({ remaining: 0, active: false });
  });

  it('can start already cooling down', () => {
    const { result } = renderHook(() => useCooldown(60, { startActive: true }));
    expect(result.current).toMatchObject({ remaining: 60, active: true });
  });
});
