export type RoadmapStatus = 'in_progress' | 'soon' | 'planned';

export type RoadmapItem = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly status: RoadmapStatus;
  readonly voteCount: number;
  readonly hasVoted: boolean;
};

const STATUSES: readonly RoadmapStatus[] = ['in_progress', 'soon', 'planned'];

function isRoadmapStatus(value: unknown): value is RoadmapStatus {
  return STATUSES.includes(value as RoadmapStatus);
}

/** Maps the `list_roadmap_items` rows, dropping any row the app cannot render. */
export function parseRoadmapItems(rows: unknown): readonly RoadmapItem[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row): RoadmapItem[] => {
    if (typeof row !== 'object' || row === null) return [];
    const item = row as Record<string, unknown>;
    if (typeof item.id !== 'string' || typeof item.title !== 'string' || !isRoadmapStatus(item.status)) return [];
    return [{
      id: item.id,
      title: item.title,
      description: typeof item.description === 'string' ? item.description : '',
      icon: typeof item.icon === 'string' && item.icon ? item.icon : 'sparkles-outline',
      status: item.status,
      voteCount: typeof item.vote_count === 'number' ? item.vote_count : 0,
      hasVoted: item.has_voted === true,
    }];
  });
}

export function withVote(item: RoadmapItem, voted: boolean, voteCount?: number): RoadmapItem {
  if (item.hasVoted === voted && voteCount === undefined) return item;
  return {
    ...item,
    hasVoted: voted,
    voteCount: voteCount ?? Math.max(0, item.voteCount + (voted ? 1 : -1)),
  };
}
