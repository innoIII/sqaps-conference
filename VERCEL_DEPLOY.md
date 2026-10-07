# دليل النشر على Vercel — مؤتمر أكاديمية السلطان قابوس لعلوم الشرطة

## المتطلبات الأساسية

1. حساب على [Vercel](https://vercel.com)
2. مشروع على GitHub/GitLab/Bitbucket يحتوي على هذا الكود
3. قاعدة بيانات PostgreSQL (موصى بها: [Prisma Postgres](https://www.prisma.io/postgres) — مجانية)

---

## خطوات النشر

### 1) ارفع المشروع إلى GitHub

```bash
git init
git add .
git commit -m "Initial commit — SQAPS Conference Portal"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sqaps-conference.git
git push -u origin main
```

### 2) اربط المشروع بـ Vercel

1. ادخل [vercel.com/new](https://vercel.com/new)
2. اختر المستودع من GitHub
3. إعدادات المشروع:
   - **Framework Preset**: Next.js
   - **Build Command**: `prisma generate && prisma db push --accept-data-loss && next build`
   - **Output Directory**: `.next` (افتراضي)
4. لا تضغط "Deploy" بعد — أضف متغيرات البيئة أولاً

### 3) متغيرات البيئة المطلوبة

في صفحة "Environment Variables" على Vercel، أضف:

#### قاعدة البيانات (إلزامي)
```
DATABASE_URL=postgresql://... (رابط Prisma Postgres)
```

#### الذكاء الاصطناعي — Claude (موصى به للحصول على أفضل جودة)
```
ANTHROPIC_API_KEY=sk-ant-api-... (مفتاح API صالح من console.anthropic.com)
```

> **ملاحظة**: مفتاح `sk-ant-usr-...` (نوع مستخدم) لا يعمل مع API.
> تحتاج مفتاح `sk-ant-api-...` من [console.anthropic.com](https://console.anthropic.com/settings/keys)
> مع رصيد API credits (منفصل عن اشتراك Claude Pro).

#### الذكاء الاصطناعي — Claude (اختياري)
```
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```
النماذج المتاحة:
- `claude-3-5-haiku-20241022` (سريع، اقتصادي) — الافتراضي
- `claude-3-5-sonnet-20241022` (أقوى، أغلى)
- `claude-3-opus-20240229` (الأقوى، الأغلى)

#### الذكاء الاصطناعي — z-ai (اختياري — يعمل بدون إعداد)
z-ai يعمل تلقائياً كـ fallback بدون أي متغيرات بيئة (الإعداد مدمج في الكود).
لتخصيصه (اختياري):
```
ZAI_CHAT_ID=chat-...
ZAI_USER_ID=...
ZAI_TOKEN=eyJhbGciOiJI...
ZAI_MODEL=glm-4.6
```

#### الإشعارات (اختياري)
```
CALLMEBOT_API_KEY=...
CALLMEBOT_PHONE=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### 4) انشر المشروع

اضغط "Deploy" وانتظر اكتمال البناء (≈ 2-3 دقائق).

---

## التحقق من عمل الذكاء الاصطناعي بعد النشر

1. ادخل إلى `/admin` على موقعك المنشور
2. اذهب إلى تبويب **"مشاركة / QR"**
3. ستجد لوحة **"حالة الذكاء الاصطناعي"** التي تعرض:
   - المزود الأساسي (Claude أو z-ai)
   - حالة كل مزود (مهيأ / غير مهيأ)
   - زر **"اختبار الآن"** لإجراء اتصال مباشر

### السيناريوهات:

#### ✅ Claude يعمل (الحالة المثالية)
```
المزود الأساسي: Claude (Anthropic)
[Claude]  ✓ نشط  · claude-3-5-haiku-20241022  [أساسي]
[z-ai REST] ✓ نشط · glm-4.6
[z-ai SDK]  ✓ نشط · glm-4.6
```

#### ⚠️ Claude غير مهيأ (يعمل عبر z-ai)
```
المزود الأساسي: z-ai REST API
[Claude]  ✗ غير مهيأ
[z-ai REST] ✓ نشط · glm-4.6  [أساسي]
[z-ai SDK]  ✓ نشط · glm-4.6
```
في هذه الحالة، الـ AI يعمل بشكل كامل عبر z-ai — لكن لإستخدام Claude:
1. تأكد من أن `ANTHROPIC_API_KEY` مضاف في Vercel
2. تأكد من أنه يبدأ بـ `sk-ant-api-` (وليس `sk-ant-usr-`)
3. تأكد من وجود رصيد API credits في حساب Anthropic

#### ❌ جميع المزودات فشلت
```
الاتصال فشل: تعذر الاتصال بأي مزود ذكاء اصطناعي
```
في هذه الحالة:
1. تأكد من اتصال الإنترنت
2. راجع سجلات Vercel (Functions → Logs)
3. تأكد من أن `maxDuration` في API routes متوافق مع خطة Vercel (Hobby = 10s, Pro = 60s)

---

## اختبار نهاية إلى نهاية

### اختبار 1: تحسين سؤال (على /qn)
1. ادخل `/qn`
2. اختر محوراً
3. اكتب سؤالاً (٥ أحرف على الأقل)
4. اضغط "تحسين صياغة السؤال"
5. يجب أن يظهر سؤال محسّن خلال ١-٣ ثواني

### اختبار 2: توليد تقرير (في /admin)
1. ادخل `/admin` → تبويب "بيانات الجلسة"
2. اختر محوراً
3. اكتب ملاحظات في حقل التقرير
4. اضغط "توليد التقرير الشامل"
5. يجب أن يظهر تقرير مفصل خلال ١٠-٣٠ ثانية

---

## استكشاف الأخطاء

### `ANTHROPIC_API_KEY` لا يعمل
- **السبب**: المفتاح من نوع مستخدم (`sk-ant-usr-`) وليس API (`sk-ant-api-`)
- **الحل**: ادخل [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
  أنشئ مفتاح API جديد وأضف رصيد (Billing → Add credits)

### `403 Forbidden` من Claude
- **السبب**: المفتاح منتهي الصلاحية أو لا يوجد رصيد
- **الحل**: راجع [console.anthropic.com](https://console.anthropic.com) → Billing

### `503 Service Unavailable` من /api/ai/*
- **السبب**: جميع المزودات فشلت
- **الحل**: راجع سجلات Vercel + تأكد من إعداد `ANTHROPIC_API_KEY` بشكل صحيح

### الـ AI يعمل لكن ببطء شديد
- **السبب**: مهلة الطلب (timeout) أطول من خطة Vercel
- **الحل**: ارفع خطة Vercel إلى Pro (60s timeout) أو استخدم Claude Haiku (أسرع)

---

## ملاحظات مهمة

1. **z-ai fallback دائماً متاح**: حتى بدون `ANTHROPIC_API_KEY`، الـ AI يعمل عبر z-ai
2. **الإعداد المدمج**: إعدادات z-ai مدمجة في الكود — لا تحتاج أي متغيرات بيئة
3. **العزل**: كل مزود يعمل بشكل مستقل — فشل واحد لا يؤثر على الآخر
4. **الشفافية**: لوحة الحالة تعرض أي مزود استجاب لكل طلب

---

## الدعم

للمساعدة، راجع:
- [وثائق Anthropic API](https://docs.anthropic.com)
- [وثائق Vercel](https://vercel.com/docs)
- [Prisma Postgres](https://www.prisma.io/postgres)
