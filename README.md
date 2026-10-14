# المؤتمر العلمي الدولي الثالث — الجرائم العابرة للحدود

بوابة المؤتمر العلمي الدولي الثالث لأكاديمية السلطان قابوس لعلوم الشرطة، تتيح استعراض محاور المؤتمر وملفاته وأوراقه العلمية مع نظام أسئلة جمهور مباشر (Real-time).

**Sultan Qaboos Academy for Police Sciences — 3rd International Scientific Conference on Transnational Crimes.**

---

## ✨ الميزات

- 🎨 تصميم رسمي عربي (RTL) بهوية كحلية/ذهبية وخط Almarai
- 📂 **محاور ديناميكية**: ٥ محاور، كل محور يقرأ ملفاته من نظام الملفات تلقائيًا (PDF، Word، PowerPoint، Excel، صور، فيديو، HTML، نص)
- 🔍 فلترة وترتيب الملفات حسب النوع/الحجم/الاسم
- 📅 برنامج المؤتمر (يومين) بـ timeline ملوّن حسب نوع الجلسة
- 💬 **أسئلة الجمهور المباشرة**: بث لحظي (SSE) من API خارجي + شارة LIVE + حالة السؤال (جديد/تمت الإجابة) + إعجابات + إجابات المحاضر
- 📱 متجاوب بالكامل (جوال / آيباد / كمبيوتر)
- ♿ دعم إمكانية الوصول (ARIA، اختصارات لوحة المفاتيح)

---

## 🛠️ التقنيات

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** + **Framer Motion**
- **lucide-react** للأيقونات
- Node.js `fs` لقراءة الملفات الديناميكية
- **Server-Sent Events (SSE)** للبث المباشر

---

## 🚀 التشغيل المحلي

### المتطلبات
- Node.js 18+ أو Bun
- Git

### الخطوات
```bash
# 1. استنساخ المستودع
git clone https://github.com/USERNAME/conference-portal.git
cd conference-portal

# 2. تثبيت الحزم
bun install        # أو: npm install

# 3. إعداد متغيرات البيئة
cp .env.example .env
# عدّل قيم .env حسب احتياجك

# 4. تشغيل بيئة التطوير
bun run dev        # أو: npm run dev

# 5. افتح المتصفح على http://localhost:3000
```

---

## ☁️ النشر على Vercel

### الخطوة 1: ارفع الكود إلى GitHub
```bash
git add -A
git commit -m "Conference portal ready for deployment"
git push origin main
```

> **مهم**: مجلد `public/content/` يجب أن يكون مرفوعًا (يحتوي ملفات المحاور).

### الخطوة 2: اربط المستودع بـ Vercel
1. اذهب إلى [vercel.com](https://vercel.com) → سجّل بـ GitHub
2. **Add New Project** → اختر مستودع `conference-portal`
3. الإعدادات (تُكشف تلقائيًا):
   - **Framework Preset**: Next.js
   - **Build Command**: `next build` (افتراضي)
   - **Output Directory**: `.next` (افتراضي)
   - **Install Command**: `bun install` أو `npm install`

### الخطوة 3: أضف متغيرات البيئة
في Vercel → **Settings → Environment Variables**، أضف:

| المتغير | القيمة | مطلوب؟ |
|--------|--------|--------|
| `AUDIENCE_QUESTIONS_API_URL` | `https://sqps-qnn.vercel.app/api/questions` | ✅ نعم |
| `AUDIENCE_QUESTIONS_SESSION_ID` | `lecture-101` | ✅ نعم |
| `AUDIENCE_QUESTIONS_API_KEY` | (مفتاح API إن لزم) | ❌ اختياري |
| `DATABASE_URL` | `file:./db/custom.db` | ❌ اختياري (لا يستخدم حاليًا) |

### الخطوة 4: Deploy
اضغط **Deploy** → انتظر 2-4 دقائق → ستحصل على رابط مباشر.

---

## 📂 إدارة المحتوى

### إضافة ملفات لمحور
ضع الملفات في المجلد المناسب:
```
public/content/track-1/   ← المحور الأول (القانون والتشريع)
public/content/track-2/   ← المحور الثاني (الأمن)
public/content/track-3/   ← المحور الثالث (التقنية)
public/content/track-4/   ← المحور الرابع (الحوكمة)
public/content/track-5/   ← المحور الخامس (المجتمع والإعلام)
```

**الصيغ المدعومة**: `.pdf` `.doc` `.docx` `.ppt` `.pptx` `.xls` `.xlsx` `.jpg` `.png` `.mp4` `.html` `.txt` وغيرها.

الملفات تظهر تلقائيًا في الموقع دون تعديل الكود — فقط `git push` وستظهر بعد إعادة النشر.

### تعديل بيانات المؤتمر
كل البيانات (التواريخ، المكان، الجدول، الإحصائيات، معلومات الاتصال) في ملف واحد:
```
src/lib/conference-info.ts
```

### تعديل المحاور
```
src/lib/tracks.ts
```

---

## 🔧 ملاحظات النشر

### البث المباشر (SSE) على Vercel
- على الخطة المجانية، اتصالات SSE تنقطع بعد ~25-60 ثانية
- **EventSource يعيد الاتصال تلقائيًا** → الأسئلة تصل خلال ثوانٍ
- لاتصال مستمر 100%: استخدم **Vercel Edge Functions** أو VPS

### لماذا لا يحتاج VPS؟
- المحتوى يُرفع مع الكود في `public/content/`
- أسئلة الجمهور تأتي من API خارجي
- لا يوجد DB مستخدم فعليًا

---

## 📁 هيكل المشروع

```
src/
├── app/
│   ├── api/
│   │   ├── audience-questions/route.ts    # REST: يجلب الأسئلة
│   │   ├── questions/stream/route.ts      # SSE: بث لحظي (proxy)
│   │   └── tracks/[trackId]/route.ts      # ملفات المحاور
│   ├── layout.tsx                         # RTL + خطوط عربية
│   ├── page.tsx                           # الصفحة الرئيسية
│   └── globals.css                        # الهوية البصرية
├── components/conference/                 # مكونات المؤتمر
├── hooks/                                 # React hooks
├── lib/                                   # منطق مشترك + بيانات
└── types/                                 # أنواع TypeScript
public/
├── logo/academy-logo.png                  # شعار الأكاديمية
└── content/track-1..5/                    # ملفات المحاور
```

---

## 📞 معلومات المؤتمر

- **الموقع الرسمي**: [sqaps.edu.om](https://sqaps.edu.om/)
- **البريد**: info@rop.gov.om
- **الهاتف**: 25656565 – 25459825

---

© 2026 المؤتمر العلمي الدولي الثالث – الجرائم العابرة للحدود · جميع الحقوق محفوظة
