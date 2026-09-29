import { useCallback, useEffect, useRef, useState } from 'react';

import type { BarberQueue, MyQueueEntry, PublicQueueStatus, QueueAction } from '@/src/queue';
import * as queueService from '@/src/services/queue';
import { queueErrorMessage } from '@/src/services/errors';

const POLL_MS = 15_000;

/**
 * The barber's live queue. Polls while `active` (the screen is focused) since
 * customers join and leave from their own phones. Actions reload the list so
 * the screen never shows a state the server has already moved past.
 */
export function useBarberQueue(active: boolean) {
  const [queue, setQueue] = useState<BarberQueue | null>(null);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await queueService.getBarberQueue();
      if (!mounted.current) return;
      setQueue(next);
      setError('');
    } catch (caught) {
      if (mounted.current) setError(queueErrorMessage(caught));
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    // Deferred like the app's other load-on-focus effects, so the first fetch
    // never sets state synchronously inside the effect body.
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active, refresh]);

  const run = useCallback(async (key: string, action: () => Promise<unknown>): Promise<boolean> => {
    setPendingId(key);
    setError('');
    try {
      await action();
      await refresh();
      return true;
    } catch (caught) {
      if (mounted.current) setError(queueErrorMessage(caught));
      // A failed action usually means the entry changed under us; show the truth.
      await refresh();
      return false;
    } finally {
      if (mounted.current) setPendingId(null);
    }
  }, [refresh]);

  const setOpen = useCallback((open: boolean) => run('open', () => queueService.setQueueOpen(open)), [run]);
  const addWalkin = useCallback(
    (name: string, serviceId: string) => run('walkin', () => queueService.addWalkin(name, serviceId)),
    [run],
  );
  const update = useCallback(
    (entryId: string, action: QueueAction) => run(entryId, () => queueService.updateQueueEntry(entryId, action)),
    [run],
  );

  // Only the very first load shows a spinner; polling refreshes stay silent.
  const loading = active && queue === null && !error;

  return { queue, loading, error, pendingId, refresh, setOpen, addWalkin, update };
}

/**
 * The signed-in customer's own place in line. Polls while `active` so the
 * position and the "your turn" call show up without a manual refresh.
 */
export function useMyQueueEntry(active: boolean) {
  const [entry, setEntry] = useState<MyQueueEntry | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await queueService.getMyQueueEntry();
      if (!mounted.current) return;
      setEntry(next);
      setLoaded(true);
      setError('');
    } catch (caught) {
      if (mounted.current) setError(queueErrorMessage(caught));
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active, refresh]);

  const leave = useCallback(async (entryId: string): Promise<boolean> => {
    setLeaving(true);
    setError('');
    try {
      await queueService.leaveQueue(entryId);
      await refresh();
      return true;
    } catch (caught) {
      if (mounted.current) setError(queueErrorMessage(caught));
      await refresh();
      return false;
    } finally {
      if (mounted.current) setLeaving(false);
    }
  }, [refresh]);

  return { entry, loaded, error, leaving, refresh, leave };
}

/** Whether a barber's queue is open and how many wait. Guests may read this. */
export function usePublicQueueStatus(barberId: string | undefined) {
  const [status, setStatus] = useState<PublicQueueStatus | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!barberId) return;
    try {
      const next = await queueService.getPublicQueueStatus(barberId);
      if (mounted.current) setStatus(next);
    } catch {
      // The join card is optional; a failed read simply hides it.
      if (mounted.current) setStatus(null);
    }
  }, [barberId]);

  useEffect(() => {
    mounted.current = true;
    const first = setTimeout(() => void refresh(), 0);
    return () => {
      mounted.current = false;
      clearTimeout(first);
    };
  }, [refresh]);

  return { status, refresh };
}

/** Join a barber's queue as the signed-in customer. */
export function useJoinQueue() {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const join = useCallback(async (barberId: string, serviceId: string): Promise<boolean> => {
    setJoining(true);
    setError('');
    try {
      await queueService.joinQueue(barberId, serviceId);
      return true;
    } catch (caught) {
      setError(queueErrorMessage(caught));
      return false;
    } finally {
      setJoining(false);
    }
  }, []);

  return { joining, error, join };
}
