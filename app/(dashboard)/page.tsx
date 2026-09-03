// 總覽首頁：今日輸液/飲水達成度 + 今日狀態卡 + 7天體重趨勢
export default function DashboardHomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">今日狀態</h1>
      <p className="text-sm text-muted-foreground">
        輸液達成度 / 飲水達成度（待接 calculateDailyProgress）+ 7 天體重趨勢（待接
        checkWeightLossAlert）
      </p>
    </div>
  )
}
