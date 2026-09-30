import { parseRoadmapItems, withVote } from '@/src/roadmap';

describe('roadmap items', () => {
  it('maps rows and drops ones the app cannot render', () => {
    const items = parseRoadmapItems([
      { id: 'a', title: 'ميزة', description: 'وصف', icon: 'star-outline', status: 'soon', vote_count: 3, has_voted: true },
      { id: 'b', title: 'بلا حالة', status: 'unknown' },
      { title: 'بلا معرف', status: 'planned' },
      null,
    ]);

    expect(items).toEqual([
      { id: 'a', title: 'ميزة', description: 'وصف', icon: 'star-outline', status: 'soon', voteCount: 3, hasVoted: true },
    ]);
  });

  it('returns an empty list for a non-array response', () => {
    expect(parseRoadmapItems(null)).toEqual([]);
  });

  it('applies a vote optimistically and then the server count', () => {
    const item = { id: 'a', title: 'ميزة', description: '', icon: 'x', status: 'planned' as const, voteCount: 2, hasVoted: false };

    expect(withVote(item, true)).toMatchObject({ hasVoted: true, voteCount: 3 });
    expect(withVote(withVote(item, true), false)).toMatchObject({ hasVoted: false, voteCount: 2 });
    expect(withVote(item, true, 9)).toMatchObject({ hasVoted: true, voteCount: 9 });
    expect(withVote({ ...item, voteCount: 0, hasVoted: true }, false).voteCount).toBe(0);
  });
});
