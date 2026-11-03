# سياق المشروع — بوابة المؤتمر العلمي الدولي الثالث (SQAPS)

> هذا الملف يُقرأ تلقائياً في Claude Code. المستودع **عام**: لا تكتب هنا ولا في أي ملف مرفوع كلمة مرور أو مفتاحاً أو رابط قاعدة بيانات.

## قواعد العمل مع المستخدم
- **الرد دائماً بالعربي** (المستخدم يكتب بلهجة خليجية). الردود رسمية ومرتبة: عناوين «أولاً، ثانياً» ونقاط مرقّمة، بلا رموز زخرفية.
- اعرض التقرير/الخطة واحصل على الموافقة قبل أي تغيير كبير. نفّذ مباشرة فقط ما طلبه صراحة.
- **تجميد المؤتمر:** المؤتمر 3–4 نوفمبر 2026. لا تحذف أي شيء (صفوف قاعدة البيانات، نشرات Vercel، ملفات) **حتى 6 نوفمبر 2026**. فحوص القراءة والنسخ الاحتياطي فقط، ولا `prisma db push`.
- بعد كل تعديل: `tsc` و`eslint` ثم النشر ثم تحقق من الموقع المباشر بنفسك (لا تطلب من المستخدم التحقق).

## الروابط
- الموقع: https://sqaps-conference.vercel.app — `/qn` أسئلة الجمهور (`/qn?s=N`)، `/map` دليل القاعات، `/admin` الإدارة (Basic Auth).
- GitHub: `innoIII/sqaps-conference` (عام). Vercel: فريق `sqps3`، مشروع `sqaps-conference`. قاعدة البيانات: Neon (منطقة us-east-1؛ معرّف المشروع في متغير `NEON_PROJECT_ID` على Vercel).

## النشر
- **النشر = push إلى `main`**؛ Vercel ينشر تلقائياً خلال ~2 دقيقة. حالة النشر بلا تسجيل دخول:
  `https://api.github.com/repos/innoIII/sqaps-conference/commits/<sha>/status` (context «Vercel»).
- الحساب الذي يدفع يجب أن يملك صلاحية الكتابة على `innoIII/sqaps-conference` (مالك المستودع أو Collaborator). على جهاز فيه أكثر من حساب GitHub اجعل الرابط `https://innoIII@github.com/innoIII/sqaps-conference.git`.
- الرجوع السريع عند عطل بعد نشر: Vercel ← Deployments ← النشرة السابقة ← **Instant Rollback** (أو `vercel rollback`). النشرة السابقة محفوظة دائماً.
- لا تضف ملفات تُستخدم في الموقع وأنت لم تبنِ: TypeScript يفشل البناء عند أي خطأ (`ignoreBuildErrors` مُزال).

## التشغيل على جهاز جديد
1. Node.js 24 LTS (22.18 كحد أدنى، لأن `npm run cards` يشغّل ملف `.mts` مباشرة) و Git و Claude Code. انسخ المستودع إلى مجلد عادي (ليس OneDrive — `node_modules` تثقل المزامنة).
2. `npm install` ثم `npx prisma generate`. لا يوجد `package-lock.json` (القفل `bun.lock`، وVercel يثبّت بـ Bun)، فلا تستخدم `npm ci`، و**لا ترفع** `package-lock.json` الذي ينشئه npm.
3. `npx vercel login` (حساب له وصول لفريق sqps3) ثم `npx vercel link --yes --scope sqps3 --project sqaps-conference` ثم
   `npx vercel env pull .env.local --environment=production` (بدون `--environment` يجلب بيئة التطوير، وهي شبه فارغة).
   تأكد أن الملف فيه `DATABASE_URL` و`ADMIN_USER` و`ADMIN_PASSWORD` و`DEEPSEEK_API_KEY` (الأسماء في `.env.example`). إذا رجع أي منها فارغاً (متغيرات Sensitive لا تُسحب)، انسخ ملف `.env` من الجهاز القديم بوسيلة خاصة — لا عبر git ولا المحادثة — أو خذ `DATABASE_URL` من لوحة Neon (مضيف `-pooler`).
4. فحص: `node scripts/ops/health.mjs` (بلا حزم، يعمل من أي نسخة) — نسخة احتياطية: `node scripts/ops/backup-db.mjs` (قراءة فقط، تحفظ في `../sqaps-backups`؛ تحتاج الخطوتين 2 و3، فشغّلها من نسخة خارج OneDrive).
5. لاستخراج نص الأوراق: Python 3 + `pdftotext` (Poppler؛ موجود مع Git for Windows في `/mingw64/bin`).

## البنية (الأهم)
- Next.js 16 (App Router، `src/proxy.ts` بدل middleware) + Prisma 6 + Neon Postgres + DeepSeek. الخط Cairo عبر `next/font`.
- **الحماية:** `/admin` و`/api/admin/*` بـ Basic Auth من `ADMIN_USER/ADMIN_PASSWORD` (Vercel env). `PUT /api/sessions/[trackId]` (بيانات الجلسة والأوراق)، `PUT /api/site-content`، `POST /api/papers/upload`، `PUT /api/map-config`، `DELETE /api/questions` للإدارة فقط.
- **رمز PIN لكل جلسة** (`track_sessions.reportPinHash`، scrypt) يحمي تقرير الرئيس والمقرر (`/api/sessions/[trackId]/report`) وأدوات المفكّر؛ الهيدر `x-report-pin`. الجلسات 1–9 عليها رموز.
- **الجلسات (tracks):** المعرّف الداخلي ≠ الرقم الظاهر. `track-1` = جلسة الخبراء (بلا رقم)، `track-2` = «الجلسة الأولى» (01)… الرقم الظاهر من محتوى `track.N.number` (يُعدّل من الإدارة ← محتوى الموقع ← المحاور؛ `trackNumber()` في `src/lib/tracks.ts`).
- **الملفات:** `public/papers/track-N/paper-S.pdf` و`cv-S.pdf` (S = ترتيب الباحث). الروابط تُملأ تلقائياً من `src/lib/papers-manifest.json` (يولّده `scripts/papers-manifest.mjs` في كل build) داخل `getTrackSession()`، لكن فقط للأوراق الموجودة في `research_papers` (مضافة من الإدارة) ورابطها في القاعدة فارغ؛ الرابط المحفوظ في القاعدة يتغلب على الملف.
- **المفكّر (AI):** يقرأ من الملفات لا من قاعدة البيانات (`src/lib/paper-knowledge.ts`): `docs/papers/track-N/paper-S.md` (النص الكامل)، `docs/cv/...`، `docs/cards/.../paper-S.json` (بطاقة تحليل يبنيها `npm run cards`). `npm run cards` يقرأ `DEEPSEEK_API_KEY` من البيئة أو `.env.local` أو `.env`. القوالب والمعايير في `src/lib/ai-prompts.ts` (8 معايير × 5 = 40). `POST /api/ai/analyze`: summary/questions/evaluate (ورقة)، compare/recommendations/report (رئيس)، minutes/discussion (مقرر)، final (البيان الختامي — **إدارة فقط**). التقييمات مخزنة في `ai_evaluations` وتُعاد تلقائياً إذا تغيّر مصدرها (ملخص ← نص كامل). كلها الـ34 جاهزة. `formalText()` في `src/lib/ai.ts` ينظف الرموز من الردود.
- **التقارير:** `session_reports` بعمود `role` (chair/secretary)، فهرس فريد `(trackId, paperSlot, role)` بـ **NULLS NOT DISTINCT أُنشئ يدوياً** — لا تشغّل `prisma db push` (سيعيد إنشاءه خطأ). الحفظ `INSERT … ON CONFLICT`. المحرر يحفظ مسودة محلية في localStorage حتى الضغط على «حفظ التقرير»، وتصدير PDF/Word بترويسة الأكاديمية (`src/lib/report-export.ts`).
- **الإدارة:** تبويب «التقييمات والبيان الختامي» (`EvaluationsAdmin.tsx` + `GET /api/admin/evaluations`)، عدّادات الاستهلاك (`/api/admin/usage`)، لوحات QR (`/admin/qr`)، الخريطة.
- **الأسئلة:** صفحة `/qn` وجدول `questions` فقط. حد 1000 حرف، 5/دقيقة لكل متصفح + 120/دقيقة لكل IP.
- **الخريطة `/map`:** صفحة ثابتة `public/map/index.html` (three.js)، إعداد القاعات في `settings` المفتاح `map.config`، `track_sessions.mapHall` يربط الجلسة بالقاعة.
- **الكاش:** القراءات العامة عليها CDN cache (`src/lib/cache.ts`)؛ الإدارة تضيف `?fresh=`.
- **العدّاد:** يعدّ إلى 9:00 أول يوم، «منعقد الآن» حتى 19:00 آخر يوم، ثم «انتهى» (من `conference.dates`).

## الحدود المجانية (للمراقبة)
- Neon Free: 100 CU-ساعة/شهر (يتجدد في 1 من الشهر)، 1 GB تخزين، تاريخ استرجاع 6 ساعات فقط ← نسخ احتياطية يدوية. الاستهلاك ~2.5 CU-h حتى صباح 3 نوفمبر، والقاعدة ~21 MB.
- Vercel Hobby: «Functions Storage» 10 GB = حزم كل النشرات المحفوظة (~52 MB لكل نشرة). `next.config.ts` يستبعد محركات Prisma غير المستخدمة. نظّف النشرات القديمة دورياً (**بعد 6 نوفمبر**).

## فخاخ معروفة
- `.gitignore` فيه `*.png`؛ مسموح فقط `public/logo/*.png` و`src/app/*.png`. أي PNG جديد في مكان آخر لن يُرفع بصمت.
- ملفات PDF من الكتيب فيها خلل lam-alef؛ الاستخراج بـ `pdftotext` ثم NFKC وإزالة علامات الاتجاه والتطويل.
- عند تعديل الملفات بسكربت Python: انتبه أن `"\b"` في نص Python العادي = حرف backspace (أخفى العدّاد مرة). استخدم raw strings أو أداة Edit.
- ويندوز يخفي الامتدادات: `paper-1.pdf.txt` يبدو `paper-1.pdf`.
- تدوير الأسرار دورياً (`ADMIN_PASSWORD`، `NEON_API_KEY`، `DEEPSEEK_API_KEY`): Vercel env ثم Redeploy.

## مهام مفتوحة
- متابعة المؤتمر: `node scripts/ops/health.mjs` كل ساعتين، و`node scripts/ops/backup-db.mjs` نهاية كل يوم (3–5 نوفمبر).
- بعد الجلسات: الإدارة ← «التقييمات والبيان الختامي» ← «إعداد المسودة»، ثم تصدير Word.
- بعد 6 نوفمبر: تدوير الأسرار، حذف النشرات القديمة في Vercel.
