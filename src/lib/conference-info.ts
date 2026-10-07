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

/**
 * Featured speakers for the conference — shown in the Speakers section on
 * the public site. Each entry has a name, role, organization, country,
 * optional topic, and optional avatar initials (used to render the gold
 * badge when no image is available).
 */
export interface KeynoteSpeaker {
  name: string;
  role: string;
  organization: string;
  country: string;
  topic?: string;
  /** When true, marks this speaker as a "keynote" (gold accent). */
  keynote?: boolean;
}

export const keynoteSpeakers: KeynoteSpeaker[] = [
  {
    name: "د. عبدالله بن سعيد العامري",
    role: "خبير قانوني دولي",
    organization: "كلية الحقوق - جامعة السلطان قابوس",
    country: "سلطنة عُمان",
    topic: "الأطر القانونية للجرائم العابرة للحدود",
    keynote: true,
  },
  {
    name: "أ.د. مريم الحسن إبراهيم",
    role: "أستاذة القانون الجنائي الدولي",
    organization: "كلية الشريعة والقانون - جامعة الأزهر",
    country: "مصر",
    topic: "التعاون القضائي الدولي في قضايا الجرائم الإلكترونية",
    keynote: true,
  },
  {
    name: "م. خالد بن ناصر الفارسي",
    role: "خبير استخبارات أمنية",
    organization: "مركز الدراسات الاستراتيجية الأمنية",
    country: "الإمارات",
    topic: "استشراف المستقبل الأمني لمواجهة الجرائم العابرة",
    keynote: true,
  },
  {
    name: "د. سارة آن وليامز",
    role: "خبيرة تقنية معلوماتية",
    organization: "Interpol Cybercrime Unit",
    country: "المملكة المتحدة",
    topic: "الحلول الرقمية الحديثة في تتبع الجرائم الإلكترونية",
    keynote: false,
  },
  {
    name: "أ. محمد بن راشد البلوشي",
    role: "خبير حوكمة وإدارة",
    organization: "معهد الإدارة العامة",
    country: "البحرين",
    topic: "الحوكمة المؤسسية في مكافحة الجرائم المنظمة",
    keynote: false,
  },
  {
    name: "د. فاطمة بن موسى الكندية",
    role: "أستاذة الإعلام المجتمعي",
    organization: "كلية الإعلام - جامعة قطر",
    country: "قطر",
    topic: "دور الإعلام في التوعية الأمنية والوقاية",
    keynote: false,
  },
];

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
