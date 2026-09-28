'use client';

import { useCallback, useEffect, useState } from 'react';

/*
 * The wait before "Resend" can be pressed again, counted down a second at a
 * time. The deadline is a timestamp rather than a decrementing number, so a
 * throttled background tab still ends the wait on time.
 */
export function useCooldown(
  seconds: number,
  options: { startActive?: boolean } = {},
) {
  const [now, setNow] = useState(() => Date.now());
  const [endsAt, setEndsAt] = useState<number | null>(() =>
    options.startActive ? Date.now() + seconds * 1000 : null,
  );

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) setEndsAt(null);
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const start = useCallback(() => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, [seconds]);

  const remaining =
    endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));

  return { remaining, active: remaining > 0, start };
}
