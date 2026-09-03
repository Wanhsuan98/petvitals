import { redirect } from 'next/navigation'

// 總覽首頁：今日輸液/飲水達成度 + 今日狀態卡 + 7天體重趨勢（待接 calculateDailyProgress / checkWeightLossAlert）
//
// TODO: 上線籌備期暫時導向 /service（服務介紹頁），讓網站根目錄看起來是完整的官網，
// 方便申請綠界金流審核。正式對外開放使用者註冊後，移除此重導向、還原儀表板內容。
export default function DashboardHomePage() {
  redirect('/service')
}
