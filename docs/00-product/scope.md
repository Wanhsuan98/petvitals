# 範疇控制清單 (Scope Boundaries)

Status: Living document
Last Updated: v1.2.0

## ✅ 現行範疇 (In Scope)

1. **PWA 跨平台安裝**：支援 Web App Manifest、Service Worker 離線快取基礎表單與圖表（僅支援離線瀏覽歷史資料，打卡寫入需連網，不做背景同步佇列）。詳見 [../04-architecture/pwa.md](../04-architecture/pwa.md)。
2. **每日照護日誌**：詳見 [../01-requirements/daily-care.md](../01-requirements/daily-care.md)。
3. **生化血檢管理**：詳見 [../01-requirements/blood-test.md](../01-requirements/blood-test.md)。
4. **多維度視覺化儀表板**：詳見 [../01-requirements/dashboard.md](../01-requirements/dashboard.md)。
5. **回診專用 A4 PDF 輸出**：詳見 [../01-requirements/report.md](../01-requirements/report.md)。
6. **多照護者協作（永久免費，v1.2）**：詳見 [../01-requirements/caregivers.md](../01-requirements/caregivers.md)。
7. **主動提醒排程（永久免費，v1.2）**：詳見 [../01-requirements/notification.md](../01-requirements/notification.md)。

## ❌ 排除範疇 (Out of Scope)

- ❌ 社群動態牆、留言互動與寵物相簿。
- ❌ **多隻貓咪管理**：目前僅開放單一貓咪檔案。`cat_profiles.owner_id` 有資料庫層級的 `unique` 限制，真的鎖死一人一貓，不只是 UI 限制；詳見 [ADR-001](../05-decisions/ADR-001-single-cat-mvp.md) 與 [roadmap.md](./roadmap.md)。
- ❌ 雙平台 Native 原生 App 開發與上架。
- ❌ 醫院端院務系統 (PIMS) 雙向 API 對接。
- ❌ LINE 整合（LINE Notify 已於 2025/3/31 停止服務；未來如需 LINE 通知須改走 LINE Messaging API 官方帳號，需另行申請與審核）。
- ❌ PWA 離線寫入背景同步（Background Sync／IndexedDB 佇列，MVP 離線時僅能瀏覽快取內容，無法離線打卡）。

## 💰 收費模式

PetVitals 不收費，所有功能永久免費，沒有訂閱分級。原本的 ECPay 定期定額訂閱機制已於 v1.2
整個移除（程式碼、API 路由、UI 全部拔除）——決策脈絡見 [ADR-002](../05-decisions/ADR-002-subscription-tier-model.md)。

多隻貓咪管理目前仍不開放（見上方排除範疇），但不再規劃成付費功能；真的要做的話，開放對象與條件留到真正動工前再決定。
