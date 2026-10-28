# 前端路由設計 (Next.js 16 App Router)

Status: Living document
Last Updated: v1.2.0

```
app/
├── (auth)/
│   ├── login/page.tsx               # Magic Link / Google 登入
│   └── layout.tsx
├── (dashboard)/                     # PWA 應用核心，底部手機導航列 (Tab Bar: 首頁 / 打卡 / 紀錄 / 設定；回診報告入口在首頁卡片與紀錄頁右上角)
│   ├── layout.tsx
│   ├── page.tsx                     # 總覽首頁：今日輸液/飲水達成度 + 今日狀態卡 + 7天體重趨勢
│   ├── loading.tsx                  # 首頁骨架畫面
│   ├── notifications/
│   │   ├── page.tsx                 # 待處理協作邀請、本裝置推播與提醒設定入口
│   │   ├── loading.tsx
│   │   └── error.tsx                # 讀取失敗可重試
│   ├── log/
│   │   ├── page.tsx                 # 每日 10 秒極速輸入表單 (React Hook Form + Zod)
│   │   └── loading.tsx
│   ├── records/
│   │   ├── page.tsx                 # 歷史血檢清單 + Chart.js 多維度趨勢圖
│   │   ├── loading.tsx
│   │   └── new/
│   │       ├── page.tsx             # 新增血檢報告表單
│   │       └── loading.tsx
│   └── settings/
│       ├── page.tsx                 # 貓咪基本資料、目標水量與醫囑設定
│       ├── loading.tsx
│       ├── caregivers/page.tsx      # 協作者邀請/移除管理頁（永久免費）
│       └── reminders/page.tsx       # 提醒排程設定頁（永久免費）
├── (export)/
│   └── report/
│       └── [petId]/page.tsx         # 獸醫回診專用 A4 摘要報告頁 (CSS Print 專用佈局)
└── api/
    ├── push/                        # 推播訂閱憑證登記/刪除
    │   ├── subscribe/route.ts
    │   └── unsubscribe/route.ts
    └── cron/
        └── send-reminders/route.ts  # cron-job.org 排程觸發，掃描到期提醒並發送 Web Push
```

> `(dashboard)/` 下每個分頁路由都是各自獨立的 Server Component，每次切換分頁都會即時對 Supabase 發查詢；為了避免切換時畫面空白卡頓，每個分頁都補上對應內容形狀的 `loading.tsx` 骨架畫面（v1.2）。

## 通知中心（v1.2）

- `/notifications` 僅需登入，不使用 `requireCatProfile()`；沿用本人 session 查詢 `pet_caregivers` 與可存取的貓咪資料。
- 首頁 Server Component 查詢本人待接受邀請，將數量傳入鈴鐺連結；設定頁保留邀請操作並提供通知中心入口。
- 重用 `PendingInvitationsSection` 與 `PushSubscribeToggle`。推播狀態以瀏覽器訂閱與權限為準，檢查逾時可重試；返回前景重新檢查。
- 接受邀請後 `revalidatePath` 通知中心、首頁、設定、打卡、紀錄及提醒頁；送出／移除邀請也讓通知入口重新驗證。跨使用者更新需對方重新導覽或重新整理，不使用 Realtime。
- 通知頁使用「重新整理」重新取得伺服器資料，資料錯誤由 route error boundary 的 `retry()` 重取；沒有邀請為明確空狀態，不當作錯誤。

## Related Documents

- 各功能行為細節：[../01-requirements/](../01-requirements/)
- 後端與資料存取：[backend.md](./backend.md)
