import { supabase } from '@/lib/supabase';
import { parseRoadmapItems, type RoadmapItem } from '@/src/roadmap';
import { toAppError } from '@/src/services/errors';

export async function loadRoadmap(): Promise<readonly RoadmapItem[]> {
  const { data, error } = await supabase.rpc('list_roadmap_items');
  if (error) throw toAppError(error);
  return parseRoadmapItems(data);
}

/** Returns the item's new total vote count. */
export async function setRoadmapVote(itemId: string, voted: boolean): Promise<number> {
  const { data, error } = await supabase.rpc('set_roadmap_vote', { item_id_value: itemId, vote_value: voted });
  if (error) throw toAppError(error);
  return typeof data === 'number' ? data : 0;
}
