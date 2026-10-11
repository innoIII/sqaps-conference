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
  /** Official contact details (used in the footer + about card). */
  contact: {
    website: string;
    websiteUrl: string;
    email: string;
    phones: string[];
  };
}

export const conferenceInfo: ConferenceInfo = {
  academy: "أكاديمية السلطان قابوس لعلوم الشرطة",
  edition: "النسخة الثالثة",
  title: "المؤتمر العلمي الدولي الثالث",
  subtitle: "الجرائم العابرة للحدود",
  tagline: "نحو تعاون دولي فعّال لمواجهة الجرائم العابرة للحدود",
  dates: "٣ – ٤ نوفمبر ٢٠٢٦",
  duration: "يومان",
  venue: "مركز البحوث والدراسات – أكاديمية السلطان قابوس لعلوم الشرطة",
  city: "نزوى، سلطنة عُمان",
  about: [
    "ينعقد المؤتمر العلمي الدولي الثالث في أكاديمية السلطان قابوس لعلوم الشرطة – نزوى، تحت شعار «الجرائم العابرة للحدود»، بمشاركة نخبة من العلماء والخبراء والمختصين من داخل السلطنة وخارجها.",
    "يهدف المؤتمر إلى استكشاف أبعاد الجرائم العابرة للحدود القانونية والأمنية والتقنية والإدارية والمجتمعية، وبناء جسور التعاون بين المؤسسات الأمنية والقضائية على المستوى الإقليمي والدولي.",
    "يستعرض المؤتمر أحدث الأبحاث والدراسات العلمية، ويسهم في صياغة توصيات عملية تعزز من قدرة المؤسسات على الاستجابة لهذه الجرائم المتطورة.",
  ],
  stats: [
    { value: "+٥٠", label: "ورقة علمية" },
    { value: "+٢٠", label: "دولة مشاركة" },
    { value: "+٣٠", label: "خبير ومتحدث" },
    { value: "٢", label: "يومان علميان" },
  ],
  contact: {
    website: "sqaps.edu.om",
    websiteUrl: "https://sqaps.edu.om/",
    email: "info@rop.gov.om",
    phones: ["25656565", "25459825"],
  },
};

/** Conference program schedule — organizers can edit. */
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

/** Keynote speaker info for the SpeakersSection. */
export interface KeynoteSpeaker {
  name: string;
  role: string;
  organization: string;
  country: string;
  topic?: string;
  /** If true, the speaker is marked as a featured keynote (gold accent). */
  keynote?: boolean;
}

export const keynoteSpeakers: KeynoteSpeaker[] = [
  {
    name: "د. عبدالله بن سعيد العامري",
    role: "أستاذ القانون الجنائي الدولي",
    organization: "كلية الحقوق - جامعة السلطان قابوس",
    country: "سلطنة عُمان",
    topic: "الأطر القانونية للجرائم العابرة للحدود في التشريع الخليجي",
    keynote: true,
  },
  {
    name: "بروفيسور سارة ميلر",
    role: "خبيرة في الأمن السيبراني الدولي",
    organization: "معهد الجريمة الإلكترونية - إنتربول",
    country: "فرنسا",
    topic: "التعاون الدولي في مكافحة الجرائم السيبرانية العابرة للحدود",
    keynote: true,
  },
  {
    name: "د. خالد بن ناصر الحارثي",
    role: "مستشار قانوني - الإدارة العامة للتحقيقات الجنائية",
    organization: "شرطة عُمان السلطانية",
    country: "سلطنة عُمان",
    topic: "التحديات الأمنية في مواجهة الجرائم المنظمة عبر الحدود",
  },
  {
    name: "د. يوسف الكواري",
    role: "خبير في الحوكمة والإدارة المؤسسية",
    organization: "مركز الحوكمة - منظمة التعاون الإسلامي",
    country: "قطر",
    topic: "دور الحوكمة الرشيدة في مواجهة الفساد العابر للحدود",
  },
  {
    name: "أ.د. مريم آل حسن",
    role: "أستاذة الإعلام والمجتمع",
    organization: "كلية الإعلام - جامعة الإمارات",
    country: "الإمارات العربية المتحدة",
    topic: "دور الإعلام في التوعية بالجرائم العابرة للحدود",
  },
  {
    name: "د. محمد بن إبراهيم القحطاني",
    role: "خبير في التحليل الجنائي الرقمي",
    organization: "الهيئة الوطنية للأمن السيبراني",
    country: "المملكة العربية السعودية",
    topic: "تقنيات الذكاء الاصطناعي في كشف الجرائم الرقمية",
    keynote: true,
  },
];

/** Partner institution info for the PartnersSection. */
export interface Partner {
  id: string;
  name: string;
  short: string;
  tier: "strategic" | "gold" | "supporter" | "supporters";
}

export const partners: Partner[] = [
  // Strategic partners
  {
    id: "sqaps",
    name: "أكاديمية السلطان قابوس لعلوم الشرطة",
    short: "أ.ق",
    tier: "strategic",
  },
  {
    id: "rop",
    name: "شرطة عُمان السلطانية",
    short: "ش.ع",
    tier: "strategic",
  },
  {
    id: "interpol",
    name: "منظمة الشرطة الجنائية الدولية - إنتربول",
    short: "إنتر",
    tier: "strategic",
  },
  // Gold partners
  {
    id: "moj",
    name: "وزارة العدل والشؤون القانونية",
    short: "ع.ض",
    tier: "gold",
  },
  {
    id: "pa",
    name: "النيابة العامة",
    short: "ن.ع",
    tier: "gold",
  },
  {
    id: "nca",
    name: "الهيئة الوطنية لحماية البيانات",
    short: "ح.ب",
    tier: "gold",
  },
  {
    id: "gcc",
    name: "مكتب التعاون الأمني - مجلس التعاون الخليجي",
    short: "خ.خ",
    tier: "gold",
  },
  // Supporters
  {
    id: "sus",
    name: "جامعة السلطان قابوس",
    short: "ج.ق",
    tier: "supporter",
  },
  {
    id: "unodc",
    name: "مكتب الأمم المتحدة المعني بالمخدرات والجريمة",
    short: "أ.م",
    tier: "supporter",
  },
  {
    id: "arabpolice",
    name: "مجلس وزراء الداخلية العرب",
    short: "و.د",
    tier: "supporter",
  },
];

export const schedule: ScheduleDay[] = [
  {
    day: "اليوم الأول",
    date: "٣ نوفمبر ٢٠٢٦",
    sessions: [
      {
        time: "٩:٠٠ ص",
        title: "الحفل الافتتاحي والكلمة الرسمية",
        type: "keynote",
      },
      {
        time: "١٠:٣٠ ص",
        title: "الجلسة الأولى: الأطر القانونية للجرائم العابرة للحدود",
        type: "session",
        trackId: 1,
      },
      { time: "١٢:٠٠ م", title: "استراحة الشاي", type: "break" },
      {
        time: "١٢:٣٠ م",
        title: "الجلسة الثانية: الاستراتيجيات الأمنية الاستشرافية",
        type: "session",
        trackId: 2,
      },
      { time: "٢:٠٠ م", title: "استراحة الغداء", type: "break" },
      {
        time: "٣:٣٠ م",
        title: "ندوة حوارية: التعاون الأمني الخليجي والدولي",
        type: "panel",
      },
    ],
  },
  {
    day: "اليوم الثاني",
    date: "٤ نوفمبر ٢٠٢٦",
    sessions: [
      {
        time: "٩:٠٠ ص",
        title: "كلمة رئيسية: التقنية والابتكار في مكافحة الجريمة",
        type: "keynote",
        trackId: 3,
      },
      {
        time: "١٠:٣٠ ص",
        title: "الجلسة الثالثة: الحلول الرقمية الحديثة",
        type: "session",
        trackId: 3,
      },
      { time: "١٢:٠٠ م", title: "استراحة الشاي", type: "break" },
      {
        time: "١٢:٣٠ م",
        title: "الجلسة الرابعة: الحوكمة والإدارة المؤسسية الرشيدة",
        type: "session",
        trackId: 4,
      },
      { time: "٢:٠٠ م", title: "استراحة الغداء", type: "break" },
      {
        time: "٣:٠٠ م",
        title: "الجلسة الخامسة: دور المجتمع والإعلام في التوعية والوقاية",
        type: "session",
        trackId: 5,
      },
      {
        time: "٤:٣٠ م",
        title: "ندوة ختامية: التوصيات والتوجهات المستقبلية",
        type: "panel",
      },
      {
        time: "٥:٣٠ م",
        title: "حفل الختام وتوزيع الشهادات",
        type: "keynote",
      },
    ],
  },
];
