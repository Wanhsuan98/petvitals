# 範疇控制清單 (Scope Boundaries)

Status: Living document
Last Updated: v1.2.0

## ✅ 現行範疇 (In Scope)

1. **PWA 跨平台安裝**：支援 Web App Manifest、Service Worker 離線快取基礎表單與圖表（僅支援離線瀏覽歷史資料，打卡寫入需連網，不做背景同步佇列）。詳見 [../04-architecture/pwa.md](../04-architecture/pwa.md)。
2. **每日照護日誌**：詳見 [../01-requirements/daily-care.md](../01-requirements/daily-care.md)。
3. **生化血檢管理**：詳見 [../01-requirements/blood-test.md](../01-requirements/blood-test.md)。
4. **多維度視覺化儀表板**：詳見 [../01-requirements/dashboard.md](../01-requirements/dashboard.md)。
5. **回診專用 A4 PDF 輸出**：詳見 [../01-requirements/report.md](../01-requirements/report.md)。
6. **多照護者協作（訂閱 Pro 進階功能，v1.2）**：詳見 [../01-requirements/caregivers.md](../01-requirements/caregivers.md)。
7. **主動提醒排程（訂閱 Pro 進階功能，v1.2）**：詳見 [../01-requirements/notification.md](../01-requirements/notification.md)。

## ❌ 排除範疇 (Out of Scope)

- ❌ 社群動態牆、留言互動與寵物相簿。
- ❌ **多隻貓咪管理**：目前僅開放單一貓咪檔案。`cat_profiles.owner_id` 有資料庫層級的 `unique` 限制，真的鎖死一人一貓，不只是 UI 限制；規劃列為訂閱 Pro 的下一階段擴充項目，詳見 [ADR-001](../05-decisions/ADR-001-single-cat-mvp.md) 與 [roadmap.md](./roadmap.md)。
- ❌ 雙平台 Native 原生 App 開發與上架。
- ❌ 醫院端院務系統 (PIMS) 雙向 API 對接。
- ❌ LINE 整合（LINE Notify 已於 2025/3/31 停止服務；未來如需 LINE 通知須改走 LINE Messaging API 官方帳號，需另行申請與審核）。
- ❌ PWA 離線寫入背景同步（Background Sync／IndexedDB 佇列，MVP 離線時僅能瀏覽快取內容，無法離線打卡）。

## 💰 訂閱分級 (Subscription Tiers)

| 功能 | 免費 | 訂閱 Pro（NT$199/月） |
| :--- | :--- | :--- |
| 每日照護日誌、血檢紀錄、圖表 | ✅ | ✅ |
| 回診 A4 PDF 匯出 | ✅ | ✅ |
| 多照護者協作（每隻貓最多 3 人，含 owner） | ❌ 僅 owner 本人 | ✅ |
| 主動提醒排程（Web Push） | ❌ | ✅ |
| 多隻貓咪管理 | ❌ | 🔜 架構已預留，尚未開放 |

> 設計原則：核心照護記錄與匯出功能永久免費，不因訂閱與否而閹割——訂閱費付的是「協作」與「自動化提醒」這類降低照護人力負擔的便利性。這是常見的免費增值（freemium）定價思路，但實際轉換率仍需靠內測數據驗證，目前沒有可引用的數據支持特定轉換率假設。決策脈絡見 [ADR-002](../05-decisions/ADR-002-subscription-tier-model.md)。
