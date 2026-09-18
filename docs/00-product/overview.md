# PetVitals 產品總覽

Status: Living document
Last Updated: v1.2.0

## 產品定位

專為確診慢性腎衰竭（IRIS 1–4 期）家貓設計的「居家時序照護防呆 × 回診決策數據管家」PWA。

## 核心價值

透過極簡打卡解決輸液/飲水計算負擔、消除用藥時序衝突、即時繪製生化指數關聯圖表，並產出一鍵回診 A4 PDF 報告。

核心記錄與匯出功能永久免費；訂閱 Pro 方案解鎖多照護者協作與主動提醒排程，降低單一照顧者的人力負擔（詳見 [scope.md](./scope.md) 的訂閱分級表）。

## 技術架構

Next.js 16 (App Router) + Tailwind CSS v4 + Shadcn UI + Zod Runtime 防禦 + TanStack Query + Supabase (PostgreSQL) + web-push (VAPID，主動提醒推播)。

詳細架構見 [04-architecture/overview.md](../04-architecture/overview.md)。

## 核心使用者旅程 (Golden Path)

```
[每日居家 (10秒)] ──► 打開 PWA ──► 輸入輸液量(ml) / 飲水量(ml) / 體重(kg) ──► 檢查輸液/飲水達成度
│
[看診歸檔 (30秒)] ──► 點擊新增血檢 ──► 輸入 BUN / Crea / SDMA / P / HCT ──────► 自動比對已設定 IRIS 分期之血磷警示
│
[回診溝通 (3秒)]  ──► 點擊「匯出回診摘要」 ─────────────────────────────────► 產出標準 A4 橫式醫療報告 PDF
```

> 訂閱 Pro 版可額外設定「主動提醒排程」（見 [01-requirements/notification.md](../01-requirements/notification.md)），於輸液/用藥排定時間點以 Web Push 主動提醒使用者開啟上述打卡流程，而非仰賴使用者自己記得。

## 相關文件

- 範疇與訂閱分級：[scope.md](./scope.md)
- 未來規劃：[roadmap.md](./roadmap.md)
- 各功能需求細節：[../01-requirements/](../01-requirements/)
- 法律免責聲明：[../99-reference/medical-disclaimer.md](../99-reference/medical-disclaimer.md)
