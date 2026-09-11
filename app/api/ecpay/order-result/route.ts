import { NextResponse, type NextRequest } from 'next/server'

// OrderResultURL：付款完成後綠界會用 Form POST 把消費者的瀏覽器導回這裡（純前端導轉，
// 消費者看得到），跟 server-to-server 的 ReturnURL 是兩回事，不需要回應 1|OK。
// 訂閱狀態一律由 ReturnURL/PeriodReturnURL 的通知負責更新，這裡只單純導回 /settings 讓
// 使用者看目前狀態即可。
//
// 這是綠界網域對我們發起的跨站 POST，瀏覽器的 SameSite=Lax session cookie 不會隨這個 POST
// 附上，所以這個 route 必須在 proxy.ts 裡設成公開路徑，否則會被誤判成未登入。
//
// 注意：不能用 getSiteOrigin()（它會優先信任 Origin header）——跨站 POST 的 Origin header
// 是「發起請求的那一方」，也就是綠界自己的網域，不是我們的網域。這裡改用
// request.nextUrl，它反映的是這個請求實際打到的主機（我們自己），才是正確的重導向基準。
export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/settings', request.nextUrl.origin), { status: 303 })
}
