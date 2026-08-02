export type ProposalId = 'calm-counter' | 'teal-stage' | 'shop-ledger';

export type ProposalMeta = {
  id: ProposalId;
  title: string;
  titleAr: string;
  pitch: string;
};

export const proposals: ProposalMeta[] = [
  {
    id: 'calm-counter',
    title: 'Calm Counter',
    titleAr: 'العداد الهادئ',
    pitch: 'Airy product UI. Soft cards, restrained teal, gold only for status.',
  },
  {
    id: 'teal-stage',
    title: 'Teal Stage',
    titleAr: 'منصة التركواز',
    pitch: 'Bold teal hero owns the top. Floating appointment card, confident hierarchy.',
  },
  {
    id: 'shop-ledger',
    title: 'Shop Ledger',
    titleAr: 'دفتر المحل',
    pitch: 'Structured ticket/ledger feel. Rules, meta grid, gold rail, denser lists.',
  },
];
