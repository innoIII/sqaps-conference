/**
 * Static conference metadata.
 *
 * Centralized so organizers can update dates / venue / stats in one place.
 * Keeping it in a lib (not a DB) matches the "filesystem = content source"
 * principle of the portal.
 */

export interface ConferenceInfo {
  academy: string;
  edition: string;
  title: string;
  subtitle: string;
  tagline: string;
  /** ISO-style display strings (Arabic). */
  dates: string;
  duration: string;
  venue: string;
  city: string;
  about: string[];
  /** Highlight statistics shown in the hero strip. */
  stats: { value: string; label: string }[];
}

export const conferenceInfo: ConferenceInfo = {
  academy: "أكاديمية السلطان قابوس لعلوم الشرطة",
  edition: "النسخة الثالثة",
  title: "المؤتمر العلمي الدولي الثالث",
  subtitle: "الجرائم العابرة للحدود",
  tagline: "نحو تعاون دولي فعّال لمواجهة الجرائم العابرة للحدود",
  dates: "٢٣ – ٢٥ فبراير ٢٠٢٦",
  duration: "ثلاثة أيام",
  venue: "مركز المؤتمرات – أكاديمية السلطان قابوس لعلوم الشرطة",
  city: "مسقط، سلطنة عُمان",
  about: [
    "ينعقد المؤتمر العلمي الدولي الثالث في أكاديمية السلطان قابوس لعلوم الشرطة تحت شعار «الجرائم العابرة للحدود»، بمشاركة نخبة من العلماء والخبراء والمختصين من داخل السلطنة وخارجها.",
    "يهدف المؤتمر إلى استكشاف أبعاد الجرائم العابرة للحدود القانونية والأمنية والتقنية والإدارية والمجتمعية، وبناء جسور التعاون بين المؤسسات الأمنية والقضائية على المستوى الإقليمي والدولي.",
    "يستعرض المؤتمر أحدث الأبحاث والدراسات العلمية، ويسهم في صياغة توصيات عملية تعزز من قدرة المؤسسات على الاستجابة لهذه الجرائم المتطورة.",
  ],
  stats: [
    { value: "+٥٠", label: "ورقة علمية" },
    { value: "+٢٠", label: "دولة مشاركة" },
    { value: "+٣٠", label: "خبير ومتحدث" },
    { value: "٣", label: "أيام علمية" },
  ],
};

/** Speaker / committee member. */
export interface Speaker {
  id: string;
  name: string;
  role: string;
  affiliation: string;
  trackId?: number;
  /** Two-letter initials fallback for avatar (no external images). */
  initials: string;
}

export const speakers: Speaker[] = [
  {
    id: "s1",
    name: "د. عبدالله المنذري",
    role: "رئيس اللجنة العلمية",
    affiliation: "أكاديمية السلطان قابوس لعلوم الشرطة",
    trackId: 1,
    initials: "ع",
  },
  {
    id: "s2",
    name: "أ.د. سعاد الفارس",
    role: "مستشارة أمنية",
    affiliation: "كلية الدفاع الوطني",
    trackId: 2,
    initials: "س",
  },
  {
    id: "s3",
    name: "د. محمد الحضرمي",
    role: "خبير في الأمن السيبراني",
    affiliation: "جامعة السلطان قابوس",
    trackId: 3,
    initials: "م",
  },
  {
    id: "s4",
    name: "أ. ريمة البلوشي",
    role: "مديرة التحليل الجنائي الرقمي",
    affiliation: "شرطة عمان السلطانية",
    trackId: 3,
    initials: "ر",
  },
  {
    id: "s5",
    name: "د. خالد العامري",
    role: "أستاذ الحوكمة والإدارة",
    affiliation: "معهد الإدارة العامة",
    trackId: 4,
    initials: "خ",
  },
  {
    id: "s6",
    name: "د. منى السعيدية",
    role: "أستاذة الإعلام والمجتمع",
    affiliation: "كلية الإعلام – جامعة صحار",
    trackId: 5,
    initials: "م",
  },
  {
    id: "s7",
    name: "اللواء / سالم الغافري",
    role: "الراعي العام للمؤتمر",
    affiliation: "أكاديمية السلطان قابوس لعلوم الشرطة",
    initials: "س",
  },
  {
    id: "s8",
    name: "د. هلال الكندي",
    role: "مقرر المؤتمر",
    affiliation: "وزارة العدل",
    initials: "ه",
  },
];

/** Partner / sponsor institution. */
export interface Partner {
  id: string;
  name: string;
  short: string;
  tier: "strategic" | "gold" | "supporter";
}

export const partners: Partner[] = [
  { id: "p1", name: "شرطة عمان السلطانية", short: "ROP", tier: "strategic" },
  { id: "p2", name: "وزارة العدل", short: "MJ", tier: "strategic" },
  { id: "p3", name: "مجلس الوزراء", short: "CoM", tier: "gold" },
  { id: "p4", name: "جامعة السلطان قابوس", short: "SQU", tier: "gold" },
  { id: "p5", name: "النيابة العامة", short: "PP", tier: "supporter" },
  { id: "p6", name: "الهيئة الوطنية للأمن السيبراني", short: "NCA", tier: "supporter" },
];

/** Conference program schedule (sample — organizers can edit). */
export interface ScheduleDay {
  day: string;
  date: string;
  sessions: {
    time: string;
    title: string;
    speaker?: string;
    type: "keynote" | "session" | "break" | "panel";
    trackId?: number;
  }[];
}

export const schedule: ScheduleDay[] = [
  {
    day: "اليوم الأول",
    date: "٢٣ فبراير ٢٠٢٦",
    sessions: [
      {
        time: "٠٩:٠٠",
        title: "الحفل الافتتاحي وكلمة أكاديمية السلطان قابوس لعلوم الشرطة",
        type: "keynote",
      },
      {
        time: "١٠:٣٠",
        title: "الجلسة الأولى: الأطر القانونية للجرائم العابرة للحدود",
        speaker: "د. عبدالله المنذري",
        type: "session",
        trackId: 1,
      },
      { time: "١٢:٠٠", title: "استراحة الشاي", type: "break" },
      {
        time: "١٢:٣٠",
        title: "الجلسة الثانية: الاستراتيجيات الأمنية الاستشرافية",
        speaker: "أ.د. سعاد الفارس",
        type: "session",
        trackId: 2,
      },
      { time: "١٤:٠٠", title: "استراحة الغداء", type: "break" },
      {
        time: "١٥:٣٠",
        title: "ندوة حوارية: التعاون الأمني الخليجي والدولي",
        type: "panel",
      },
    ],
  },
  {
    day: "اليوم الثاني",
    date: "٢٤ فبراير ٢٠٢٦",
    sessions: [
      {
        time: "٠٩:٠٠",
        title: "كلمة رئيسية: التقنية والابتكار في مكافحة الجريمة",
        speaker: "د. محمد الحضرمي",
        type: "keynote",
        trackId: 3,
      },
      {
        time: "١٠:٣٠",
        title: "الجلسة الثالثة: الحلول الرقمية الحديثة",
        speaker: "أ. ريمة البلوشي",
        type: "session",
        trackId: 3,
      },
      { time: "١٢:٠٠", title: "استراحة الشاي", type: "break" },
      {
        time: "١٢:٣٠",
        title: "الجلسة الرابعة: الحوكمة والإدارة المؤسسية الرشيدة",
        speaker: "د. خالد العامري",
        type: "session",
        trackId: 4,
      },
      { time: "١٤:٠٠", title: "استراحة الغداء", type: "break" },
      {
        time: "١٥:٣٠",
        title: "ورشة عمل: أدوات التحليل الجنائي الرقمي",
        type: "panel",
        trackId: 3,
      },
    ],
  },
  {
    day: "اليوم الثالث",
    date: "٢٥ فبراير ٢٠٢٦",
    sessions: [
      {
        time: "٠٩:٠٠",
        title: "الجلسة الخامسة: دور المجتمع والإعلام في التوعية والوقاية",
        speaker: "د. منى السعيدية",
        type: "session",
        trackId: 5,
      },
      { time: "١٠:٣٠", title: "استراحة الشاي", type: "break" },
      {
        time: "١١:٠٠",
        title: "ندوة ختامية: التواصيات والتوجهات المستقبلية",
        type: "panel",
      },
      {
        time: "١٢:٣٠",
        title: "حفل الختام وتوزيع الشهادات",
        type: "keynote",
      },
    ],
  },
];
