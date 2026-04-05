import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import admin from 'npm:firebase-admin@11.11.1';

// إعداد Firebase ببيانات الاعتماد المخزنة في متغيرات البيئة
const serviceAccountKeyStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');

if (serviceAccountKeyStr && admin.apps.length === 0) {
  try {
    const serviceAccountKey = JSON.parse(serviceAccountKeyStr);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
    });
  } catch (e) {
    console.error("فشل في تهيئة Firebase", e);
  }
}

Deno.serve(async (req) => {
  try {
    // 1. استلام الطلب من Database Webhook
    const payload = await req.json();

    if (payload.type !== 'INSERT' || payload.table !== 'notification_history') {
      return new Response(JSON.stringify({ error: 'Invalid request origin' }), { status: 400 });
    }

    const { user_id, title, body, category, payload_data } = payload.record;

    // 2. الاتصال بقاعدة البيانات لجلب رموز أجهزة المستخدم (FCM Tokens)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; 

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .eq('user_id', user_id)
      .like('endpoint', 'fcm:%');

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No devices registered for this user' }), { status: 200 });
    }

    if (!serviceAccountKeyStr) {
       console.error("متغير البيئة FIREBASE_SERVICE_ACCOUNT_KEY مفقود");
       return new Response(JSON.stringify({ error: 'FCM Not Configured on Server' }), { status: 500 });
    }

    // استخراج رموز الأجهزة
    const tokens = subscriptions.map((sub: any) => sub.endpoint.split('fcm:')[1]).filter(Boolean);
    
    if (tokens.length === 0) {
        return new Response(JSON.stringify({ message: 'No valid FCM tokens found' }), { status: 200 });
    }

    // 3. ترتيب الإشعار وإرساله عبر Firebase
    let url = '#';
    if (payload_data && typeof payload_data === 'object' && payload_data.url) {
      url = payload_data.url;
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        category: category || 'default',
        url: url, // توجيه المستخدم لصفحة معينة عند النقر
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`تم الإرسال: ${response.successCount}, فشل: ${response.failureCount}`);

    // إزالة الرموز المنتهية الصلاحية (Invalid Tokens)
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
          failedTokens.push(`fcm:${tokens[idx]}`);
        }
      });

      if (failedTokens.length > 0) {
        await supabase.from('push_subscriptions').delete().in('endpoint', failedTokens);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: response.successCount, 
        failed: response.failureCount 
      }),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (error: any) {
    console.error('خطأ غير متوقع:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
