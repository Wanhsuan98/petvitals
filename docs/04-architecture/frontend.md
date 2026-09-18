# 前端路由設計 (Next.js 16 App Router)

Status: Living document
Last Updated: v1.2.0

```
app/
├── (auth)/
│   ├── login/page.tsx               # Magic Link / Google 登入
│   └── layout.tsx
├── (dashboard)/                     # PWA 應用核心，底部手機導航列 (Tab Bar: 首頁 / 打卡 / 報告 / 設定)
│   ├── layout.tsx
│   ├── page.tsx                     # 總覽首頁：今日輸液/飲水達成度 + 今日狀態卡 + 7天體重趨勢
│   ├── loading.tsx                  # 首頁骨架畫面
│   ├── log/
│   │   ├── page.tsx                 # 每日 10 秒極速輸入表單 (React Hook Form + Zod)
│   │   └── loading.tsx
│   ├── records/
│   │   ├── page.tsx                 # 歷史血檢清單 + Chart.js 多維度趨勢圖
│   │   ├── loading.tsx
│   │   └── new/page.tsx             # 新增血檢報告表單
│   └── settings/
│       ├── page.tsx                 # 貓咪基本資料、目標水量與醫囑設定、訂閱管理
│       ├── loading.tsx
│       ├── caregivers/page.tsx      # [訂閱 Pro，規劃中] 協作者邀請/移除管理頁
│       └── reminders/page.tsx       # [訂閱 Pro，規劃中] 提醒排程設定頁
├── (export)/
│   └── report/
│       └── [petId]/page.tsx         # 獸醫回診專用 A4 摘要報告頁 (CSS Print 專用佈局)
└── api/
    ├── ecpay/                       # 綠界定期定額訂閱：checkout / callback / order-result
    ├── push/                        # [訂閱 Pro，規劃中] subscribe / unsubscribe
    │   ├── subscribe/route.ts
    │   └── unsubscribe/route.ts
    └── cron/
        └── send-reminders/route.ts  # [訂閱 Pro，規劃中] 排程觸發，掃描到期提醒並發送 Web Push
```

> `(dashboard)/` 下每個分頁路由都是各自獨立的 Server Component，每次切換分頁都會即時對 Supabase 發查詢；為了避免切換時畫面空白卡頓，每個分頁都補上對應內容形狀的 `loading.tsx` 骨架畫面（v1.2）。

## Related Documents

- 各功能行為細節：[../01-requirements/](../01-requirements/)
- 後端與資料存取：[backend.md](./backend.md)
