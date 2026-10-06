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
