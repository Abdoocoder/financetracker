# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Landing Page Smoke Test >> should have a working link to the login page
- Location: e2e\smoke.spec.ts:25:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login/
Received string:  "http://localhost:3000/"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    8 × unexpected value "http://localhost:3000/"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]: ف
          - generic [ref=e7]: فجرك
        - generic [ref=e8]:
          - link "تسجيل الدخول" [active] [ref=e9] [cursor=pointer]:
            - /url: /login
          - link "ابدأ ←" [ref=e10] [cursor=pointer]:
            - /url: /register
    - generic [ref=e11]:
      - generic [ref=e14]: "✨ جديد: حاسبة FIRE + حاسبة الزكاة + تقارير PDF 🇯🇴🇸🇦🇦🇪"
      - heading "كلنا نحلم بالثراء هنا تبدأ الرحلة" [level=1] [ref=e15]:
        - text: كلنا نحلم بالثراء
        - text: هنا تبدأ الرحلة
      - paragraph [ref=e16]: أول أداة مالية عربية تمشي معك خطوة بخطوة — من أول دينار تسجّله حتى تحقق حريتك المالية.
      - generic [ref=e17]:
        - link "ابدأ مجاناً ←" [ref=e18] [cursor=pointer]:
          - /url: /register
        - link "شاهد كيف يعمل ↓" [ref=e19] [cursor=pointer]:
          - /url: "#features"
      - generic [ref=e20]:
        - generic [ref=e21]: ✓ مجاني للأبد
        - generic [ref=e22]: ✓ بدون بطاقة ائتمانية
        - generic [ref=e23]: ✓ يدعم الاستثمار الحلال
      - generic [ref=e24]: 🇯🇴🇸🇦🇦🇪🇪🇬🇲🇦🇰🇼🇶🇦🇧🇭 مصمم للعالم العربي
      - link "📱 تحميل تطبيق Android — متاح الآن ✨" [ref=e26] [cursor=pointer]:
        - /url: /download
    - generic [ref=e28]:
      - generic [ref=e34]: fajrak.com/dashboard
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]: لوحة التحكم
            - generic [ref=e39]: ملخص هذا الشهر
          - generic [ref=e40]: 🔔 3
        - generic [ref=e41]:
          - generic [ref=e42]:
            - generic [ref=e43]: +2,400
            - generic [ref=e44]: الدخل
          - generic [ref=e45]:
            - generic [ref=e46]: 1,250
            - generic [ref=e47]: المصاريف
          - generic [ref=e48]:
            - generic [ref=e49]: +1,150
            - generic [ref=e50]: الصافي
        - generic [ref=e51]:
          - generic [ref=e52]:
            - generic [ref=e53]: 🗺️ خارطة الثراء
            - generic [ref=e54]: "المرحلة 2: سداد الديون"
          - generic [ref=e60]:
            - generic [ref=e61]: 72/100
            - generic [ref=e62]:
              - generic [ref=e63]: الخطوة التالية
              - generic [ref=e64]: سدّد أصغر دين أولاً 🎯
        - generic [ref=e66]: الإيرادات والمصروفات
    - generic [ref=e86]:
      - generic [ref=e87]:
        - generic [ref=e88]: المشكلة
        - heading "تعبت من هذا كله؟" [level=2] [ref=e89]
        - paragraph [ref=e90]: معظم الناس يتنقلون بين ٣-٤ تطبيقات وأوراق لفهم وضعهم المالي
      - generic [ref=e91]:
        - generic [ref=e92]:
          - generic [ref=e93]: محلول ✓
          - generic [ref=e94]: 📱
          - generic [ref=e95]: تطبيق البنك + تطبيق الاستثمار + Excel
          - generic [ref=e96]: تفتح ٣ تطبيقات وتحسب يدوياً كل مرة تريد تعرف وين وقف وضعك.
        - generic [ref=e97]:
          - generic [ref=e98]: محلول ✓
          - generic [ref=e99]: 💸
          - generic [ref=e100]: الأقساط تفاجئك
          - generic [ref=e101]: قسط السيارة، قرض البنك، دين صديق — كلها تجي في نفس الوقت وأنت ما حاسب.
        - generic [ref=e102]:
          - generic [ref=e103]: محلول ✓
          - generic [ref=e104]: 🌍
          - generic [ref=e105]: التطبيقات العالمية ما تفهمك
          - generic [ref=e106]: YNAB وMint مبنيين للسوق الأمريكي — ما يدعمون الريال ولا الدينار.
        - generic [ref=e107]:
          - generic [ref=e108]: محلول ✓
          - generic [ref=e109]: 🎯
          - generic [ref=e110]: تحفظ لكن ما تعرف إذا وصلت
          - generic [ref=e111]: عندك هدف في بالك لكن ما في مكان تتابع تقدمك بشكل واضح.
    - generic [ref=e112]:
      - generic [ref=e113]:
        - generic [ref=e114]: رحلتك
        - heading "أين أنت الآن؟ وإلى أين تريد أن تصل؟" [level=2] [ref=e115]:
          - text: أين أنت الآن؟
          - text: وإلى أين تريد أن تصل؟
        - paragraph [ref=e116]: فجرك يحدد مرحلتك المالية الحقيقية ويمشي معك خطوة بخطوة حتى تصل لليد العليا
      - generic [ref=e117]:
        - generic [ref=e118]:
          - generic [ref=e119]: 🌱
          - generic [ref=e120]:
            - generic [ref=e121]:
              - generic [ref=e122]: "01"
              - generic [ref=e123]: الوعي المالي
            - generic [ref=e124]: تعرف أين يذهب راتبك. تسجل مصاريفك. تفهم وضعك الحقيقي.
            - generic [ref=e125]: "\"ما لا يُقاس لا يُحسَّن\""
        - generic [ref=e126]:
          - generic [ref=e127]: 💳
          - generic [ref=e128]:
            - generic [ref=e129]:
              - generic [ref=e130]: "02"
              - generic [ref=e131]: سداد الديون
            - generic [ref=e132]: خطة سداد واضحة. خصم تلقائي شهري. احتفال عند كل دين تسدده.
            - generic [ref=e133]: "\"اقضِ دينك وارتح\""
        - generic [ref=e134]:
          - generic [ref=e135]: 🛡️
          - generic [ref=e136]:
            - generic [ref=e137]:
              - generic [ref=e138]: "03"
              - generic [ref=e139]: صندوق الطوارئ
            - generic [ref=e140]: ثلاثة أشهر من الأمان. درع ضد المفاجآت. نوم هادئ كل ليلة.
            - generic [ref=e141]: "\"تَصَدَّقُوا وَلَوْ بِشِقِّ تَمْرَةٍ\""
        - generic [ref=e142]:
          - generic [ref=e143]: 📈
          - generic [ref=e144]:
            - generic [ref=e145]:
              - generic [ref=e146]: "04"
              - generic [ref=e147]: الاستثمار
            - generic [ref=e148]: أسهم حلال. عملات رقمية. محفظة تنمو وأنت نائم.
            - generic [ref=e149]: "\"وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ\""
        - generic [ref=e150]:
          - generic [ref=e151]: 👑
          - generic [ref=e152]:
            - generic [ref=e153]:
              - generic [ref=e154]: "05"
              - generic [ref=e155]: الحرية المالية
              - generic [ref=e156]: 🎯 الهدف النهائي
            - generic [ref=e157]: اليد العليا. تعطي ولا تحتاج. تساعد عائلتك وتتصدق بيسر.
            - generic [ref=e158]: "\"اليد العليا خير من اليد السفلى\""
      - link "ابدأ رحلتك اليوم ←" [ref=e160] [cursor=pointer]:
        - /url: /register
    - generic [ref=e161]:
      - generic [ref=e162]:
        - generic [ref=e163]: الميزات
        - heading "كل ما تحتاجه في مكان واحد" [level=2] [ref=e164]
      - generic [ref=e165]:
        - generic [ref=e166]:
          - generic [ref=e167]: أساسي
          - generic [ref=e168]: 🗺️
          - generic [ref=e169]: خارطة الثراء
          - generic [ref=e170]: اكتشف مرحلتك المالية الحقيقية واحصل على نقاط صحة مالية مع خطة واضحة للوصول للحرية المالية.
        - generic [ref=e171]:
          - generic [ref=e172]: جديد
          - generic [ref=e173]: 🎮
          - generic [ref=e174]: رحلة الثروة
          - generic [ref=e175]: نقاط، مستويات، شارات، وسلسلة يومية — كل معاملة تقربك خطوة نحو الحرية المالية.
        - generic [ref=e176]:
          - generic [ref=e177]: جديد
          - generic [ref=e178]: 📊
          - generic [ref=e179]: مستشار مالي ذكي
          - generic [ref=e180]: قاعدة 50/30/20 تلقائية + تحليل ذكي يوجهك لأفضل توزيع لدخلك.
        - generic [ref=e181]:
          - generic [ref=e182]: جديد
          - generic [ref=e183]: 💡
          - generic [ref=e184]: توجيه بناء الثروة
          - generic [ref=e185]: نصيحة مالية شخصية يومية بناءً على وضعك الفعلي — ديون، استثمار، أو ادخار.
        - generic [ref=e186]:
          - generic [ref=e187]: 💳
          - generic [ref=e188]: خطة سداد الديون
          - generic [ref=e189]: رتّب ديونك وتتبع الدفعات مع خصم تلقائي شهري. واعرف متى ستكون حراً منها بالضبط.
        - generic [ref=e190]:
          - generic [ref=e191]: 📈
          - generic [ref=e192]: تتبع الاستثمارات
          - generic [ref=e193]: راقب محفظتك من أسهم وعملات رقمية. أرباح وخسائر لحظية بأسعار حية مع دعم الاستثمار الحلال.
        - generic [ref=e194]:
          - generic [ref=e195]: 💎
          - generic [ref=e196]: الأصول الشخصية
          - generic [ref=e197]: سجّل عقاراتك ومركباتك وذهبك واعرف صافي ثروتك الحقيقية مباشرة في خارطة الثراء.
        - generic [ref=e198]:
          - generic [ref=e199]: 🏆
          - generic [ref=e200]: تحديات الادخار
          - generic [ref=e201]: تحديات أسبوعية وشهرية تتبعها تلقائياً من معاملاتك — بدون أي إدخال يدوي.
        - generic [ref=e202]:
          - generic [ref=e203]: جديد
          - generic [ref=e204]: 🎓
          - generic [ref=e205]: دروس يومية ذكية
          - generic [ref=e206]: درس مالي يومي مخصص لمرحلتك — مبني على أبحاث علم السلوك المالي. من الوعي حتى الحرية المالية.
        - generic [ref=e207]:
          - generic [ref=e208]: 🔔
          - generic [ref=e209]: تنبيهات ذكية
          - generic [ref=e210]: تقرير أسبوعي، تذكير مسائي، وتوجيه يومي — مع سياسة ذكية تمنع الإشعارات المزعجة.
        - generic [ref=e211]:
          - generic [ref=e212]: 🌐
          - generic [ref=e213]: عربي + English
          - generic [ref=e214]: واجهة كاملة باللغتين العربية والإنجليزية مع دعم RTL احترافي.
        - generic [ref=e215]:
          - generic [ref=e216]: جديد
          - generic [ref=e217]: 🔥
          - generic [ref=e218]: حاسبة FIRE
          - generic [ref=e219]: احسب متى تحقق حريتك المالية — أوضاع Lean/Full/Fat FIRE مع محاكاة الفائدة المركبة ومتزلجات تفاعلية.
        - generic [ref=e220]:
          - generic [ref=e221]: جديد
          - generic [ref=e222]: 🌙
          - generic [ref=e223]: حاسبة الزكاة
          - generic [ref=e224]: ملء تلقائي من بياناتك الحقيقية. عداد حول لكل استثمار مع تذكيرات Push قبل 30 و7 و0 يوم.
        - generic [ref=e225]:
          - generic [ref=e226]: جديد
          - generic [ref=e227]: 📊
          - generic [ref=e228]: تاريخ الصحة المالية
          - generic [ref=e229]: رسم بياني لتطور نقاط صحتك المالية خلال 30 يوماً — اكتشف الاتجاه الصاعد في رحلتك.
        - generic [ref=e230]:
          - generic [ref=e231]: جديد
          - generic [ref=e232]: 📄
          - generic [ref=e233]: تقرير PDF الشهري
          - generic [ref=e234]: "طباعة ملخص مالي شهري شامل: الدخل، المصاريف، الفئات، الديون، والأهداف — جاهز للطباعة بلحظة."
    - generic [ref=e236]:
      - generic [ref=e237]:
        - generic [ref=e238]: 🗺️
        - generic [ref=e239]:
          - generic [ref=e240]: ✨ ميزة حصرية جديدة
          - heading "خارطة الثراء" [level=3] [ref=e241]
      - paragraph [ref=e242]: مش بس تتبع المصاريف — احصل على صورة كاملة عن صحتك المالية مع خطة واضحة لبناء ثروتك خطوة بخطوة.
      - generic [ref=e243]:
        - generic [ref=e244]:
          - generic [ref=e245]: 🎯
          - generic [ref=e246]:
            - generic [ref=e247]: مرحلتك المالية
            - generic [ref=e248]: طوارئ → ديون → استثمار → ثروة
        - generic [ref=e249]:
          - generic [ref=e250]: 💯
          - generic [ref=e251]:
            - generic [ref=e252]: نقاط الصحة المالية
            - generic [ref=e253]: درجة من 100 تعكس وضعك الحقيقي
        - generic [ref=e254]:
          - generic [ref=e255]: 💪
          - generic [ref=e256]:
            - generic [ref=e257]: نقاط قوتك
            - generic [ref=e258]: اكتشف ما تفعله صح في حياتك المالية
        - generic [ref=e259]:
          - generic [ref=e260]: 👣
          - generic [ref=e261]:
            - generic [ref=e262]: الخطوة التالية
            - generic [ref=e263]: توصية عملية واحدة واضحة وقابلة للتطبيق
    - generic [ref=e264]:
      - generic [ref=e265]:
        - heading "ماذا يقول المستخدمون؟" [level=2] [ref=e266]
        - paragraph [ref=e267]: آراء حقيقية من مستخدمين في العالم العربي
      - generic [ref=e269]:
        - generic [ref=e270]:
          - generic [ref=e271]: ★
          - generic [ref=e272]: ★
          - generic [ref=e273]: ★
          - generic [ref=e274]: ★
          - generic [ref=e275]: ★
        - paragraph [ref=e276]: هذه شهادة وتقييم حقيقي
        - generic [ref=e277]:
          - generic [ref=e278]: ع
          - generic [ref=e279]:
            - generic [ref=e280]: عبدالله ابوصغيرة 🇯🇴
            - generic [ref=e281]: مطور التطبيق
    - generic [ref=e282]:
      - generic [ref=e283]:
        - heading "بسيط وشفاف" [level=2] [ref=e284]
        - paragraph [ref=e285]: ابدأ مجاناً، وطوّر عندما تحتاج
      - generic [ref=e286]:
        - generic [ref=e287]:
          - generic [ref=e288]: مجاني
          - generic [ref=e289]: $0
          - generic [ref=e290]: للأبد
          - generic [ref=e291]:
            - generic [ref=e292]: ✓
            - generic [ref=e293]: المعاملات الأساسية
          - generic [ref=e294]:
            - generic [ref=e295]: ✓
            - generic [ref=e296]: تتبع الديون
          - generic [ref=e297]:
            - generic [ref=e298]: ✓
            - generic [ref=e299]: أهداف الادخار
          - generic [ref=e300]:
            - generic [ref=e301]: ✓
            - generic [ref=e302]: خارطة الثراء 🗺️
          - generic [ref=e303]:
            - generic [ref=e304]: ✓
            - generic [ref=e305]: رحلة الثروة 🎮
          - generic [ref=e306]:
            - generic [ref=e307]: ✓
            - generic [ref=e308]: مستشار مالي 🤖
          - generic [ref=e309]:
            - generic [ref=e310]: ✓
            - generic [ref=e311]: الأصول الشخصية 💎
          - generic [ref=e312]:
            - generic [ref=e313]: ✓
            - generic [ref=e314]: تحديات الادخار 🏆
          - generic [ref=e315]:
            - generic [ref=e316]: ✓
            - generic [ref=e317]: توجيه يومي 💡
          - generic [ref=e318]:
            - generic [ref=e319]: ✓
            - generic [ref=e320]: تنبيهات ذكية 🔔
          - generic [ref=e321]:
            - generic [ref=e322]: ✓
            - generic [ref=e323]: راتب تلقائي
          - generic [ref=e324]:
            - generic [ref=e325]: ✓
            - generic [ref=e326]: حاسبة FIRE 🔥
          - generic [ref=e327]:
            - generic [ref=e328]: ✓
            - generic [ref=e329]: حاسبة الزكاة 🌙
          - generic [ref=e330]:
            - generic [ref=e331]: ✓
            - generic [ref=e332]: تاريخ الصحة المالية 📊
          - generic [ref=e333]:
            - generic [ref=e334]: ✓
            - generic [ref=e335]: تقرير PDF الشهري 📄
          - link "ابدأ مجاناً" [ref=e336] [cursor=pointer]:
            - /url: /register
        - generic [ref=e337]:
          - generic [ref=e338]: قريباً
          - generic [ref=e339]: Pro
          - generic [ref=e340]: قريباً
          - generic [ref=e341]: نعمل عليها الآن
          - generic [ref=e342]:
            - generic [ref=e343]: ◇
            - generic [ref=e344]: 🤖 مستشار مالي بالذكاء الاصطناعي
          - generic [ref=e345]:
            - generic [ref=e346]: ◇
            - generic [ref=e347]: 📸 OCR — مسح الفواتير تلقائياً
          - generic [ref=e348]:
            - generic [ref=e349]: ◇
            - generic [ref=e350]: 📊 تقارير متقدمة ورسوم تفصيلية
          - generic [ref=e351]:
            - generic [ref=e352]: ◇
            - generic [ref=e353]: 🔔 إشعارات Push مخصصة
          - generic [ref=e354]:
            - generic [ref=e355]: ◇
            - generic [ref=e356]: 🔗 ربط حسابات بنكية
          - generic [ref=e357]:
            - generic [ref=e358]: ◇
            - generic [ref=e359]: ⭐ دعم أولوية
          - generic [ref=e360]:
            - generic [ref=e361]: 🎁 عرض خاص لأول 100 مشترك
            - generic [ref=e362]: خصم 50% مدى الحياة — فقط لمن يسجّل مبكراً
            - link "سجّل الآن واحجز مكانك ←" [ref=e363] [cursor=pointer]:
              - /url: /register
    - generic [ref=e364]:
      - heading "أسئلة شائعة" [level=2] [ref=e365]
      - generic [ref=e366]:
        - generic [ref=e367]:
          - generic [ref=e368]: هل بياناتي آمنة؟
          - generic [ref=e369]: نعم. كل بيانات المستخدم محمية بـ Row Level Security — لا يمكن لأي مستخدم رؤية بيانات غيره.
        - generic [ref=e370]:
          - generic [ref=e371]: ما العملات المدعومة؟
          - generic [ref=e372]: ندعم الدينار الأردني، الريال السعودي، الدرهم الإماراتي، والدولار الأمريكي. المزيد قادم.
        - generic [ref=e373]:
          - generic [ref=e374]: هل يعمل على الموبايل؟
          - generic [ref=e375]: نعم! التطبيق PWA يعمل على كل الأجهزة وكأنه تطبيق موبايل أصيل مع إشعارات Push.
        - generic [ref=e376]:
          - generic [ref=e377]: كيف تعمل خارطة الثراء؟
          - generic [ref=e378]: تحلّل خارطة الثراء وضعك المالي تلقائياً وتعطيك نقاط صحة مالية من 100 مع تحديد مرحلتك وأولويات خطواتك القادمة.
        - generic [ref=e379]:
          - generic [ref=e380]: ما هو نظام رحلة الثروة؟
          - generic [ref=e381]: نظام نقاط وشارات ومستويات يحوّل إدارة مالك إلى رحلة ممتعة — كل معاملة تسجّلها تكسبك نقاطاً وتقربك من الحرية المالية.
        - generic [ref=e382]:
          - generic [ref=e383]: كيف يعمل الراتب التلقائي؟
          - generic [ref=e384]: تحدد راتبك ويوم استلامه في الإعدادات، وسيُضاف تلقائياً كمعاملة دخل كل شهر.
        - generic [ref=e385]:
          - generic [ref=e386]: كيف تعمل حاسبة الزكاة؟
          - generic [ref=e387]: "تجلب حاسبة الزكاة بياناتك الفعلية تلقائياً: مدخراتك كنقد، استثماراتك بالسعر الحالي، وديونك كخصوم. كما تعرض عداد حول لكل استثمار وترسل إشعارات قبل 30 و7 و0 يوم من موعد الزكاة."
        - generic [ref=e388]:
          - generic [ref=e389]: ما هي حاسبة FIRE؟
          - generic [ref=e390]: FIRE اختصار لـ Financial Independence, Retire Early. الحاسبة تحسب رقم الحرية المالية الخاص بك بناءً على مصاريفك، وتمحي لك الوقت المتبقي للوصول إليه مع محاكاة الفائدة المركبة.
    - generic [ref=e392]:
      - heading "وضعك المالي يستحق أكثر من Excel 💡" [level=2] [ref=e393]
      - paragraph [ref=e394]: ابدأ مجاناً الآن وشوف أين يذهب راتبك خلال دقيقتين
      - link "جرّب مجاناً — لا بطاقة مطلوبة ✓" [ref=e395] [cursor=pointer]:
        - /url: /register
      - generic [ref=e396]:
        - generic [ref=e397]: ✓ مجاني للأبد
        - generic [ref=e398]: ✓ بدون بطاقة
        - generic [ref=e399]: ✓ 30 ثانية للتسجيل
    - generic [ref=e401]:
      - generic [ref=e402]: 🌅
      - heading "لماذا بنينا هذا التطبيق؟" [level=2] [ref=e403]
      - paragraph [ref=e404]: رؤيتنا أن يكون كل إنسان على دراية كاملة بوضعه المالي، ويملك خطة واضحة للتحسين — بغض النظر عن دخله أو مستواه — حتى ينجح في تحقيق حريته المالية.
      - generic [ref=e406]:
        - generic [ref=e407]:
          - generic [ref=e408]: 🕌
          - generic [ref=e409]: مستلهم من الإسلام
          - generic [ref=e410]: السعي والعمل والقناعة
        - generic [ref=e411]:
          - generic [ref=e412]: 🎓
          - generic [ref=e413]: يُعلّم لا يتتبع فقط
          - generic [ref=e414]: درس يومي يغير تفكيرك
        - generic [ref=e415]:
          - generic [ref=e416]: 🔒
          - generic [ref=e417]: بياناتك لك وحدك
          - generic [ref=e418]: أمان كامل بدون استثناء
        - generic [ref=e419]:
          - generic [ref=e420]: 🆓
          - generic [ref=e421]: مجاني للأبد
          - generic [ref=e422]: الوعي المالي حق للجميع
      - paragraph [ref=e424]: "\"كل رحلة ثراء تبدأ بخطوة\" — بُني بـ ❤️ من الأردن للعالم العربي"
    - contentinfo [ref=e425]:
      - generic [ref=e426]:
        - generic [ref=e427]: ف
        - generic [ref=e428]: فجرك
      - paragraph [ref=e429]: © 2026 فجرك — إدارة مالية ذكية للعالم العربي
    - generic [ref=e430]:
      - generic [ref=e431]:
        - generic [ref=e432]: جاهز تتحكم في أموالك؟
        - generic [ref=e433]: مجاني تماماً · بدون بطاقة ائتمانية
      - link "ابدأ الآن ←" [ref=e434] [cursor=pointer]:
        - /url: /register
  - button "Open Next.js Dev Tools" [ref=e440] [cursor=pointer]:
    - generic [ref=e443]:
      - text: Rendering
      - generic [ref=e444]:
        - generic [ref=e445]: .
        - generic [ref=e446]: .
        - generic [ref=e447]: .
  - alert [ref=e448]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Landing Page Smoke Test', () => {
  4  |   test('should load the landing page and show key brand elements', async ({ page }) => {
  5  |     // Go to the home page
  6  |     await page.goto('/');
  7  | 
  8  |     // Check for the brand name "فجرك" in the nav
  9  |     const brandName = page.getByText('فجرك').first();
  10 |     await expect(brandName).toBeVisible();
  11 | 
  12 |     // Check for the main hero heading
  13 |     const heroHeading = page.getByRole('heading', { name: 'كلنا نحلم بالثراء' });
  14 |     await expect(heroHeading).toBeVisible();
  15 | 
  16 |     // Check for the "تسجيل الدخول" (Login) button
  17 |     const loginBtn = page.getByRole('link', { name: 'تسجيل الدخول' });
  18 |     await expect(loginBtn).toBeVisible();
  19 | 
  20 |     // Check for "ابدأ مجاناً" (Start for free) CTA
  21 |     const startBtn = page.getByRole('link', { name: 'ابدأ مجاناً ←' });
  22 |     await expect(startBtn).toBeVisible();
  23 |   });
  24 | 
  25 |   test('should have a working link to the login page', async ({ page }) => {
  26 |     await page.goto('/');
  27 |     await page.getByRole('link', { name: 'تسجيل الدخول' }).click();
  28 |     
  29 |     // Should navigate to /login
> 30 |     await expect(page).toHaveURL(/\/login/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  31 |     
  32 |     const loginHeading = page.getByRole('heading', { level: 1 });
  33 |     // Check if login heading is present (assuming it contains "تسجيل الدخول" or similar)
  34 |     await expect(loginHeading).toBeVisible();
  35 |   });
  36 | });
  37 | 
```