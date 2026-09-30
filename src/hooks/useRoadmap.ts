import { useCallback, useState } from 'react';

import { withVote, type RoadmapItem } from '@/src/roadmap';
import * as roadmapService from '@/src/services/roadmap';

export function useRoadmap() {
  const [items, setItems] = useState<readonly RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await roadmapService.loadRoadmap());
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleVote = useCallback(async (item: RoadmapItem) => {
    const next = !item.hasVoted;
    setError(null);
    // Optimistic: show the vote immediately, then settle on the server's count.
    setItems((current) => current.map((row) => (row.id === item.id ? withVote(row, next) : row)));
    try {
      const total = await roadmapService.setRoadmapVote(item.id, next);
      setItems((current) => current.map((row) => (row.id === item.id ? withVote(row, next, total) : row)));
    } catch (caught) {
      setItems((current) => current.map((row) => (row.id === item.id ? item : row)));
      setError(caught);
    }
  }, []);

  return { items, loading, error, load, toggleVote };
}
