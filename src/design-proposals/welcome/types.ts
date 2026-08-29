export type WelcomeProposalId = 'impeccable' | 'taste' | 'pro-max';

export type WelcomeProposalMeta = {
  id: WelcomeProposalId;
  title: string;
  titleAr: string;
  subtitleAr: string;
  badge: string;
  pitch: string;
  skillsHighlight: string;
};

export const welcomeProposals: WelcomeProposalMeta[] = [
  {
    id: 'impeccable',
    title: 'Impeccable',
    titleAr: 'الدقة المعمارية (Impeccable)',
    subtitleAr: 'تناغم بصري نقي · دقة سويسرية على الورق الهادئ',
    badge: 'Precision & Polish',
    pitch: 'تصميم فائق الدقة يعتمد النسب الرياضية الذهبية، هدوء بصري مطلق، وبنية شبكية متوازنة لأقصى درجات الوضوح.',
    skillsHighlight: 'Pixel-perfect typography, golden ratio spacing, monolithic hierarchy, subtle micro-elevation.',
  },
  {
    id: 'taste',
    title: 'Taste',
    titleAr: 'الذوق الرفيع (Editorial Taste)',
    subtitleAr: 'لمسة تحريرية راقية · حكاية تجربة الحلاقة والراحة',
    badge: 'Artisanal & Editorial',
    pitch: 'تصميم تحريري دافئ مستوحى من المجلات الراقية، يسرد طقوس الحلاقة في ثلاثة فصول ممتعة مع لمسات ذهبية حصرية.',
    skillsHighlight: 'Warm parchment aesthetic, narrative chapter cards, curated quote framing, bespoke seal emblem.',
  },
  {
    id: 'pro-max',
    title: 'UI/UX Pro Max',
    titleAr: 'الأداء التفاعلي الأقصى (UI/UX Pro Max)',
    subtitleAr: 'تفاعل حي فوري · تجربة حجز ملموسة قبل التسجيل',
    badge: 'High Conversion & Utility',
    pitch: 'واجهة هندسية تفاعلية تمكّن المستخدم من تجربة الحجز الحي بالضغط واختيار المواعيد ومحاكاة تذكرة QR قبل إنشاء حسابه.',
    skillsHighlight: 'Interactive live-booking widget, tactile persona switch, instant QR preview, sticky conversion dock.',
  },
];
