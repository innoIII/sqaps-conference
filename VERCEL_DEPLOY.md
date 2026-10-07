# دليل النشر على Vercel — مؤتمر أكاديمية السلطان قابوس لعلوم الشرطة

## المتطلبات الأساسية

1. حساب على [Vercel](https://vercel.com)
2. مشروع على GitHub يحتوي على هذا الكود
3. قاعدة بيانات PostgreSQL (موصى بها: [Prisma Postgres](https://www.prisma.io/postgres) — مجانية)
4. مفتاح AI من أحد المزودين أدناه (انظر قسم "الذكاء الاصطناعي")

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

---

## الذكاء الاصطناعي — اختر أحد الخيارات

> **مهم**: z-ai (الذي يعمل في الـ sandbox) قد **لا يعمل على Vercel** لأنه
> مرتبط بهذه البيئة. تحتاج أحد المزودات التالية لتشغيل AI على Vercel.

### الخيار 1: OpenRouter (موصى به — مجاني + يدعم Claude) ⭐

OpenRouter يعطيك وصولاً لـ Claude + Llama + Mistral + Gemini بنفس المفتاح.

1. ادخل [openrouter.ai/keys](https://openrouter.ai/keys)
2. أنشئ مفتاح API (يبدأ بـ `sk-or-v1-...`)
3. أضف في Vercel:
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   ```

**اختياري — تغيير النموذج** (الافتراضي: Llama 3.3 70B مجاني):
```
# Claude عبر OpenRouter (مدفوع، رخيص):
OPENROUTER_MODEL=anthropic/claude-3.5-haiku

# أو Claude Sonnet (أعلى جودة):
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# أو Llama مجاني:
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# أو Mistral مجاني:
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free

# أو Gemini مجاني:
OPENROUTER_MODEL=google/gemini-flash-1.5:free
```

### الخيار 2: Groq (سريع جداً + مجاني)

Groq يستخدم رقائق LPU (أسرع 10x من GPU) + طبقة مجانية سخية.

1. ادخل [console.groq.com/keys](https://console.groq.com/keys)
2. أنشئ مفتاح API (يبدأ بـ `gsk_...`)
3. أضف في Vercel:
   ```
   GROQ_API_KEY=gsk_...
   ```

**اختياري — تغيير النموذج** (الافتراضي: Llama 3.3 70B):
```
GROQ_MODEL=llama-3.3-70b-versatile       # الأفضل (افتراضي)
GROQ_MODEL=llama-3.1-8b-instant          # سريع جداً
GROQ_MODEL=mixtral-8x7b-32768            # سياق 32K
```

### الخيار 3: Anthropic مباشرة (مدفوع — أفضل جودة)

1. ادخل [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. أنشئ مفتاح API (يبدأ بـ `sk-ant-api-...`)
3. **مهم**: أضف رصيد API credits (منفصل عن اشتراك Claude Pro)
4. أضف في Vercel:
   ```
   ANTHROPIC_API_KEY=sk-ant-api-...
   ```

**اختياري — تغيير النموذج**:
```
ANTHROPIC_MODEL=claude-3-5-haiku-20241022   # سريع (افتراضي)
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # أقوى
ANTHROPIC_MODEL=claude-3-opus-20240229      # الأقوى
```

> ⚠️ **تحذير**: مفتاح `sk-ant-usr-...` (نوع مستخدم) **لا يعمل** مع API.
> تحتاج مفتاح `sk-ant-api-...` مع رصيد API credits.

### الخيار 4: بدون AI (فقط z-ai fallback)

بدون أي مفتاح، النظام يحاول استخدام z-ai تلقائياً.
**قد لا يعمل على Vercel** — موصى به فقط للاختبار المحلي.

---

## ترتيب الأولوية

عند تفعيل عدة مزودات، النظام يستخدمها بهذا الترتيب:

```
1. Claude (ANTHROPIC_API_KEY)        ← الأفضل
2. OpenRouter (OPENROUTER_API_KEY)   ← موصى به
3. Groq (GROQ_API_KEY)               ← سريع + مجاني
4. z-ai REST                          ← sandbox فقط
5. z-ai SDK                           ← sandbox فقط
```

النظام يجرب كل مزود بالترتيب، وإذا فشل ينتقل للتالي تلقائياً.

---

## متغيرات البيئة الكاملة

### إلزامي
```
DATABASE_URL=postgresql://... (رابط Prisma Postgres)
```

### الذكاء الاصطناعي (اختر واحداً على الأقل)
```
OPENROUTER_API_KEY=sk-or-v1-...      # موصى به
# أو
GROQ_API_KEY=gsk_...                 # سريع + مجاني
# أو
ANTHROPIC_API_KEY=sk-ant-api-...     # Claude مباشرة
```

### اختياري — تخصيص النماذج
```
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
GROQ_MODEL=llama-3.3-70b-versatile
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

### اختياري — الإشعارات
```
CALLMEBOT_API_KEY=...
CALLMEBOT_PHONE=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

---

## التحقق من عمل AI بعد النشر

1. ادخل `/admin` على موقعك المنشور
2. اذهب إلى تبويب **"مشاركة / QR"**
3. ستجد لوحة **"حالة الذكاء الاصطناعي"** التي تعرض:
   - المزود الأساسي النشط
   - حالة كل مزود من المزودات الخمسة
   - زر **"اختبار الآن"** للتحقق المباشر

### السيناريو المثالي (مع OpenRouter):
```
المزود الأساسي: OpenRouter
[Claude]      ✗ غير مهيأ
[OpenRouter]  ✓ نشط · meta-llama/llama-3.3-70b-instruct:free  [أساسي]
[Groq]        ✗ غير مهيأ
[z-ai REST]   ✓ نشط · glm-4.6
[z-ai SDK]    ✓ نشط · glm-4.6
```

### السيناريو مع Claude مباشرة:
```
المزود الأساسي: Claude (Anthropic)
[Claude]      ✓ نشط · claude-3-5-haiku-20241022  [أساسي]
[OpenRouter]  ✗ غير مهيأ
[Groq]        ✗ غير مهيأ
[z-ai REST]   ✓ نشط · glm-4.6
[z-ai SDK]    ✓ نشط · glm-4.6
```

---

## اختبار نهاية إلى نهاية

### اختبار 1: تحسين سؤال (على /qn)
1. ادخل `/qn`
2. اختر محوراً
3. اكتب سؤالاً (٥ أحرف على الأقل)
4. اضغط "تحسين صياغة السؤال"
5. يجب أن يظهر سؤال محسّن خلال ١-٥ ثواني

### اختبار 2: توليد تقرير (في /admin)
1. ادخل `/admin` → تبويب "بيانات الجلسة"
2. اختر محوراً
3. اكتب ملاحظات في حقل التقرير
4. اضغط "توليد التقرير الشامل"
5. يجب أن يظهر تقرير مفصل خلال ٥-٣٠ ثانية

---

## خطة الطوارئ — ضمان تشغيل AI يوم المؤتمر

### نظام الموثوقية المدمج

النظام مصمم بـ **٥ طبقات حماية** لضمان تشغيل AI يوم المؤتمر:

#### الطبقة ١: إعادة المحاولة التلقائية
كل مزود يُعاد محاولته **مرتين** مع تأخير متزايد:
- المحاولة ١: فوري
- المحاولة ٢: بعد ٥٠٠ms
- المحاولة ٣: بعد ١٥٠٠ms
- ثم ينتقل للمزود التالي

#### الطبقة ٢: الانتقال التلقائي (Failover)
عند فشل مزود، ينتقل النظام تلقائياً للتالي:
```
Claude → OpenRouter → Groq → z-ai REST → z-ai SDK
```

#### الطبقة ٣: قاطع الدائرة (Circuit Breaker)
بعد **٥ محاولات فاشلة متتالية**، يُعطل المزود مؤقتاً (لا يُجرب مرة أخرى).
هذا يمنع تأخير الاستجابة بسبب مزود معطل.

**لإعادة التشغيل**: /admin → مشاركة / QR → "إعادة تشغيل القواطع"

#### الطبقة ٤: ذاكرة المزود النشط
النظام يتذكر آخر مزود نجح ويجربه أولاً في الطلبات التالية. هذا يسرّع
الاستجابة من ~3s إلى ~1s بعد أول طلب ناجح.

#### الطبقة ٥: النسخة الاحتياطية المحلية
**إذا فشل جميع المزودات**، يُولد النظام رداً مبسطاً محلياً (بدون AI):
- للتقارير: قالب تقرير جاهز للتعبئة اليدوية
- للأسئلة: رسالة تطلب من المستخدم الكتابة مباشرة
- للإجابات: رسالة تطلب من الرئيس الرد يدوياً

**الواجهة لا تتعطل أبداً** — حتى لو ماتت جميع مزودات AI.

### قائمة فحص يوم المؤتمر

```
□ أضف مفتاحين على الأقل: OPENROUTER_API_KEY + GROQ_API_KEY
□ اختبر الوكيل قبل المؤتمر: /admin → مشاركة / QR → اختبار الآن
□ راقب لوحة "خطة الطوارئ" — تتحدث كل ٣٠ ثانية
□ إذا تعطل AI: اضغط "إعادة تشغيل القواطع"
□ النسخة الاحتياطية المحلية تضمن أن الواجهة لا تتعطل أبداً
```

### مراقبة يوم المؤتمر

في `/admin` → تبويب "مشاركة / QR" ستجد ٣ لوحات:

1. **رمز QR** — لمشاركة رابط طرح الأسئلة
2. **حالة الذكاء الاصطناعي** — المزودات المهيأة + اختبار مباشر
3. **خطة الطوارئ** — حالة مباشرة + قواطع + إجراءات طوارئ

اللوحة الثالثة تتحدث تلقائياً كل ٣٠ ثانية. راقبها يوم المؤتمر.

---

## استكشاف الأخطاء

### `401 Unauthorized` من OpenRouter
- **السبب**: مفتاح API خاطئ أو منتهي
- **الحل**: راجع [openrouter.ai/keys](https://openrouter.ai/keys)

### `429 Rate limit` من Groq
- **السبب**: تجاوزت حد الطبقة المجانية
- **الحل**: انتظر دقيقة، أو ارفع لخطة مدفوعة، أو استخدم OpenRouter

### `403 Forbidden` من Claude
- **السبب**: مفتاح `sk-ant-usr-` (نوع مستخدم) أو لا يوجد رصيد
- **الحل**: احصل على `sk-ant-api-` + أضف رصيد في Billing

### `503 Service Unavailable` من /api/ai/*
- **السبب**: جميع المزودات فشلت
- **الحل**: راجع سجلات Vercel + تأكد من إعداد أحد المفاتيح

### الـ AI يعمل لكن ببطء شديد
- **الحل**: استخدم Groq (الأسرع) أو Claude Haiku (سريع)

---

## ملاحظات مهمة

1. **z-ai fallback مؤقت**: يعمل في هذا الـ sandbox فقط — على Vercel قد لا يعمل
2. **OpenRouter الأفضل للبدء**: مجاني + يدعم Claude + يعمل من أي server
3. **العزل**: كل مزود يعمل بشكل مستقل — فشل واحد لا يؤثر على الآخر
4. **الشفافية**: لوحة الحالة تعرض أي مزود استجاب لكل طلب
5. **الترقية سهلة**: ابدأ بـ OpenRouter المجاني، وأضف Claude لاحقاً بدون تغيير الكود

---

## الدعم

للمساعدة، راجع:
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Groq Docs](https://console.groq.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Vercel Docs](https://vercel.com/docs)
- [Prisma Postgres](https://www.prisma.io/postgres)
