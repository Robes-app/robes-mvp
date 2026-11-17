import { useEffect, useState } from 'react';

// How long a job may keep her waiting before the screen says so and offers Try again (audit F5).
export const JOB_PATIENCE_MS = 90_000;

// True once `waiting` has held for `ms` without a break; `restart` begins the wait again (Try
// again). A wait that ends resets it.
export function useTimedOut(waiting: boolean, ms = JOB_PATIENCE_MS): [boolean, () => void] {
  const [out, setOut] = useState(false);
  const [round, setRound] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new round restarts the clock
  useEffect(() => {
    setOut(false);
    if (!waiting) return;
    const timer = setTimeout(() => setOut(true), ms);
    return () => clearTimeout(timer);
  }, [waiting, ms, round]);
  return [out, () => setRound((r) => r + 1)];
}
