import { NextResponse } from "next/server"
export async function GET() {
  try {
    const { sendFCMNotification } = await import("@/lib/firebase-admin")
    const ok = await sendFCMNotification("dEBeV1jPScArWmWHfM94ZP:APA91bEeywaFNbTg9IXskk8hBmUW8eT6xpH5SX2fGC02UuCl8xUJ-dxCQ0Ym0fXxJURGu9KUFTixeIA3Xc4_6dwITrIyyVxOv2jsTpN40yTbxPyQLBxMZtI","🔔 اختبار","هل وصل؟","https://fajrak.com/dashboard")
    return NextResponse.json({ ok, key_length: process.env.FIREBASE_PRIVATE_KEY?.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, key_length: process.env.FIREBASE_PRIVATE_KEY?.length })
  }
}
