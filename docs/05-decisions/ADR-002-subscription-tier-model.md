# ADR-002: 訂閱分級模型——核心功能、多照護者協作與主動提醒排程皆永久免費

Status: Accepted（v1.2.0 開發期間三度修訂，見下方 Update，第三次已徹底移除 ECPay 訂閱機制）

## Context

v1.0/v1.1 的 ECPay 訂閱純粹是付費機制，沒有跟任何功能綁定（訂閱與否使用者體驗完全一樣）。v1.2 規劃加入多照護者協作與主動提醒排程時，需要決定這些新功能要不要收費、以及怎麼收費。

同時考量到：這類慢性病照護 App 的核心價值在於「持續記錄」，如果把核心記錄/匯出功能也鎖進付費牆，會在使用者最需要建立習慣、累積口碑的早期階段造成流失，且可能被腎貓社群認為是趁人之危。

## Decision（原始版本，已被下方 Update 取代）

- 核心照護記錄（每日日誌、血檢、圖表、PDF 匯出）永久免費，不因訂閱與否而閹割。
- 訂閱 Pro（NT$199/月）只解鎖「降低照護人力負擔」類的協作/自動化功能：多照護者協作、主動提醒排程，未來的多隻貓咪管理也規劃在此。

## Consequences（原始版本）

- 好處：免費版本身就是完整可用的產品，有利於社群口碑擴散與內測招募；訂閱的價值主張清楚（協作與自動化），不是「閹割版 vs 完整版」。
- 代價：付費功能都是「錦上添花」而非「不付費就不能用」，轉換率可能低於把核心功能鎖付費牆的做法；目前沒有內測數據可以驗證這個假設，需要在正式招募內測使用者後追蹤實際轉換率再檢討。

## Update：多照護者協作改為永久免費

開發過程中改變決定：**多照護者協作不再綁定訂閱狀態**，改成跟核心記錄功能一樣永久免費，訂閱目前唯一解鎖的差異化功能只剩主動提醒排程。

實測期間也確實觀察到訂閱狀態綁定會放大既有的痛點——這個專案的 ECPay webhook 不保證即時送達、訂閱狀態需要手動點「重新查詢狀態」才會更新（見 [綠界金流備援機制](../04-architecture/backend.md)），把協作功能綁在這個還不夠穩定的狀態上，會讓一個原本應該很簡單的「邀請家人一起顧貓」的動作，變成要先搞定訂閱金流卡關才能用，這跟功能本身想解決的「降低照護人力負擔」目標是矛盾的。

RLS 層面的異動見 `supabase/migrations/20260918050000_remove_caregiver_subscription_gate.sql`。

## Update：主動提醒排程也改為永久免費

開發完成並進入實機測試階段後，再次改變決定：**主動提醒排程也不再綁定訂閱狀態**，跟多照護者協作一樣改成永久免費。

目前的結果是：**ECPay 訂閱目前沒有解鎖任何已上線的功能**，唯一還規劃在訂閱 Pro 底下的是尚未開放的多隻貓咪管理（見 [../00-product/scope.md](../00-product/scope.md)）。ECPay 的金流串接本身沒有移除，仍保留在 v1.0 就上線的付費訂閱機制，但它現在對免費版使用者體驗沒有任何限制作用；是否要繼續維護這套金流、或是等多隻貓咪管理真的開發時再評估，是一個後續需要另外討論的產品決策，不在這次異動範圍內。

應用層的異動：`app/(dashboard)/settings/reminders/actions.ts` 的 `createReminderScheduleAction`、`app/(dashboard)/settings/reminders/page.tsx`、`app/api/cron/send-reminders` 都拿掉了 `getLatestSubscription` 檢查。

## Update：徹底移除 ECPay 訂閱機制

上一個 Update 把「要不要繼續維護這套金流」列為待討論的開放問題；這次正式拍板：**整個 ECPay 訂閱機制直接移除**，不是只拿掉功能門檻，而是連金流串接本身都拔掉。

決策理由很直接：訂閱已經沒有解鎖任何已上線的功能（見上一個 Update），唯一規劃中可能用到訂閱分級的多隻貓咪管理也還沒開發、沒有確定會收費（見 [roadmap.md](../00-product/roadmap.md)）。繼續保留一套沒有任何功能依賴、每次改動都要考慮金流正確性與安全性（CheckMacValue 驗證、webhook 冪等性）的程式碼，純粹是維護成本，沒有對應的產品價值。

移除範圍：

- 程式碼：`lib/ecpay/`、`app/api/ecpay/` 全部刪除；`lib/data/subscriptions.ts`、`app/(dashboard)/settings/subscription-section.tsx` 刪除；`app/(dashboard)/settings/actions.ts` 的 `cancelSubscriptionAction`/`refreshSubscriptionStatusAction`、`app/(dashboard)/settings/page.tsx` 的訂閱方案卡片一併移除。
- 設定：`next.config.ts` 原本為了本機測試 ECPay webhook 而加的 `allowedDevOrigins` tunnel 白名單、`lib/supabase/middleware.ts` 的 ECPay 路徑白名單都拿掉。
- `app/service/page.tsx`：價格方案改寫成「永久免費」、刪除退款政策整節（沒有付費就沒有退款可言）、隱私權政策拿掉綠界第三方金流處理的描述。
- **資料庫層刻意不動**：`subscriptions` 資料表與其 RLS 政策保留不刪，只是變成沒有程式碼使用的孤兒資料表——裡面有真實跑過綠界金流測試的歷史交易紀錄，直接刪表是不可逆動作，沒有急迫性要現在處理，之後真的確定不需要了再評估。
- 環境變數：`ECPAY_MERCHANT_ID`/`ECPAY_HASH_KEY`/`ECPAY_HASH_IV` 三個不再需要，需要自行到 Vercel 移除。

## Related

- [../00-product/scope.md](../00-product/scope.md)（訂閱分級表）
- [ADR-003](./ADR-003-caregiver-cap.md)
