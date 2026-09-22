# 後端架構 (Supabase / RLS / 金流 / 推播)

Status: Living document
Last Updated: v1.2.0

## Supabase 與 RLS（現行，v1.0）

- 認證：Supabase Auth（Magic Link + Google OAuth），透過 `proxy.ts`（Next.js 16 把 `middleware.ts` 改名為 `proxy.ts`）在每個 request 刷新 session 並依登入狀態導向。
- 資料表：`cat_profiles`、`daily_care_logs`、`blood_tests`、`subscriptions`。
- RLS 模型：`cat_profiles.owner_id = auth.uid()`；`daily_care_logs`/`blood_tests` 透過 EXISTS 子查詢比對 `cat_profiles.owner_id = auth.uid()`。目前只認得單一 owner，不認得協作者。
- **重要維運提醒**：這個專案裡透過 SQL Editor 建立的資料表，不會自動繼承預設的 GRANT 權限。每張新表都要記得補上明確的 `grant ... to <role>` 給每個會用到它的角色（`authenticated`、`service_role`），否則會出現 `permission denied for table X` 這類 runtime 才會發現的錯誤。這是本專案已經踩過至少三次的坑（`cat_profiles`/`daily_care_logs`/`blood_tests`、`subscriptions` 對 `authenticated`、`subscriptions` 對 `service_role`）。

## RLS 模型變更（v1.2：多照護者協作，migration 已寫好，見 `supabase/migrations/20260918*`）

開放協作者後，`daily_care_logs`/`blood_tests` 的政策需要新增「你是這隻貓的 accepted caregiver」條件。**owner 維持 `for all`（含 delete）；caregiver 只給 `select`/`insert`，不給 `delete`**（code review 抓到的問題：一開始 caregiver 分支也用 `for all`，等於任何協作者都能直接刪除整隻貓的照護紀錄，超出「僅能讀寫」的文件範疇，對追蹤病史的 App 是真實的資料保護風險。修正見 `20260922000000_restrict_caregiver_delete.sql`）：

```sql
-- owner：for all（不變）
exists (
  select 1 from cat_profiles
  where cat_profiles.id = daily_care_logs.pet_id
    and cat_profiles.owner_id = auth.uid()
)

-- caregiver：分開的 select + insert 政策，都用同一個條件，但沒有 delete
exists (
  select 1 from pet_caregivers
  where pet_caregivers.pet_id = daily_care_logs.pet_id
    and pet_caregivers.user_id = auth.uid()
    and pet_caregivers.status = 'ACCEPTED'
)
```

> **產品決策變更**：這個功能最初設計成綁定訂閱狀態（owner 訂閱要 active，第 2 位起的協作者才有存取權），後來改成跟核心記錄功能一樣永久免費，不再檢查訂閱——只保留人數上限。決策脈絡見 [ADR-002](../05-decisions/ADR-002-subscription-tier-model.md)。上面這段 SQL 是拿掉訂閱檢查後的最終版本（見 `20260918050000_remove_caregiver_subscription_gate.sql`），跟訂閱狀態相關的舊版本 SQL 跟坑已經不適用，不再贅述。

**實作時抓到的坑（已修正）**：`cat_profiles` 的協作者讀取政策查 `pet_caregivers`，`pet_caregivers` 的 owner 管理政策又查 `cat_profiles`——這兩張表的 RLS 互相查對方，Postgres 偵測到會無限展開，直接報錯 `infinite recursion detected in policy for relation cat_profiles`。而且不只協作者會踩到：一般 owner 查自己的貓時，Postgres 仍然會一併評估協作者那條政策（多個 permissive 政策是用 OR 組合，不會因為第一條就成立而跳過），所以這個 bug 一度讓**所有人**都讀不到 `cat_profiles`，不只協作者功能壞掉。修法是用 `security definer` 函式（`owns_cat_profile`、`is_invited_caregiver`）打斷循環——函式內部查詢用「建立函式的角色」執行（這裡是 table owner，預設略過自己表的 RLS），不再用「目前登入的使用者」身分觸發對方表的 RLS（見 `20260918030000_fix_cat_profiles_caregiver_rls_recursion.sql`）。**這是一類值得記住的坑：只要兩張表的 RLS 政策互相查對方（不限於單向鏈），就會觸發這個錯誤，設計新政策時要留意雙向依賴，不只檢查單向。**

角色邊界：

- **owner**：唯一能管理訂閱（訂閱/取消）、邀請或移除協作者、刪除貓咪檔案的角色。owner 的權限完全來自 `cat_profiles.owner_id`，`pet_caregivers` 表裡沒有 owner 自己的資料列。
- **caregiver**：可讀寫 `daily_care_logs` / `blood_tests`，可讀（不能寫）`cat_profiles`，但不能寫入 `pet_caregivers`（只能把自己的邀請從 `PENDING` 改成 `ACCEPTED`，且有 trigger 擋下順便偷改 `pet_id`/`user_id` 的權限升級風險）。caregiver 不需要讀 `subscriptions`，這個功能不再檢查訂閱狀態。
- 人數上限（`MAX_CAREGIVERS_PER_PET = 3`，owner 隱含算 1 人 + `pet_caregivers` 的 `ACCEPTED`/`PENDING` 筆數）**同時在應用層跟 DB 層檢查**，跟訂閱無關。應用層（`countActiveCaregiverSeats`）只是先做一次友善的預先檢查；真正擋住併發邀請超過上限的是 `pet_caregivers` 的 `before insert` trigger（`enforce_caregiver_cap`），用 `pg_advisory_xact_lock` 把同一隻貓的併發新增序列化，避免兩個併發邀請都通過應用層檢查、都寫入成功（code review 抓到的 TOCTOU 競態條件，修正見 `20260922010000_enforce_caregiver_cap_in_db.sql`）。**這個上限數字目前在 `lib/schemas.ts` 的 `MAX_CAREGIVERS_PER_PET` 跟這個 trigger 裡各寫一份，Postgres 沒辦法直接引用 TypeScript 常數，之後調整上限要記得兩邊一起改。**

詳細需求見 [../01-requirements/caregivers.md](../01-requirements/caregivers.md)，資料契約見 [../02-data-contract/pet-caregiver.md](../02-data-contract/pet-caregiver.md)，決策脈絡見 [../05-decisions/ADR-003-caregiver-cap.md](../05-decisions/ADR-003-caregiver-cap.md)。

### 邀請時把 email 換成 user id

`auth.users` 不透過 PostgREST 對外開放查詢（也不該開放，裡面有密碼雜湊等敏感欄位）。邀請協作者時，owner 只有 email，需要一個方式換成 `auth.users.id` 才能寫進 `pet_caregivers.user_id`。做法是一個 `security definer` 的 Postgres 函式 `find_user_id_by_email(text)`，只 `grant execute` 給 `service_role`，一般使用者連呼叫都不行（見 `20260918020000_caregiver_invite_lookup.sql`）。若查不到，代表對方還沒有 PetVitals 帳號，依產品設計請對方先註冊/登入，不做站外邀請連結。

比對用 `lower(email) = lower(lookup_email)`（見 `20260922020000_case_insensitive_caregiver_email_lookup.sql`）——一開始是大小寫敏感的 `=`，owner 打的大小寫跟帳號實際註冊的不同就查不到人，錯誤訊息卻說「找不到帳號」，誤導使用者以為對方沒註冊（code review 抓到）。

### `getCatProfile()` 現在也認得協作者

`lib/data/cat-profile.ts` 的 `getCatProfile(supabase, userId)` 原本只查 `owner_id = userId`。開放協作者後，一個純協作者（自己沒養貓）會被這個查詢判定「沒有貓」，導致 `requireCatProfile()` 把他導去 `/settings` 重新填貓咪資料表單，永遠進不去打卡/首頁/血檢頁——等於功能做完卻沒人用得到。現在改成：先查自己擁有的貓，找不到才查自己是 `accepted` caregiver 的貓（取最早接受邀請的一筆）。一個人同時擁有自己的貓又是別人協作者的情況，目前只會看到自己的貓，這跟多隻貓咪管理是同一個未來要解的問題（見 [../00-product/roadmap.md](../00-product/roadmap.md)）。

連動地，`settings/page.tsx` 也要判斷「這隻貓是不是我自己的」：不是自己的貓時，貓咪資料改成唯讀顯示（不能透過表單誤觸發建立一筆屬於自己的新貓咪資料），訂閱方案卡片整個隱藏（訂閱是 owner 專屬的管理項目，不能讓協作者看到或誤以為能操作）。

### 應用層流程

- 邀請/移除協作者：`app/(dashboard)/settings/caregivers/actions.ts`，只有 owner 能呼叫。owner 身分檢查抽成 `lib/data/cat-profile.ts` 的 `getOwnedCatProfile()`（回傳「自己擁有的貓」，不是自己的一律當 null），兩個 action 共用，不再各自重複寫 `catProfile.ownerId !== user.id`（code review 抓到的重複邏輯）。邀請時依序檢查：owner 身分 → email 格式 → 人數上限預先檢查 → 用 `find_user_id_by_email` 把 email 換成 user id → 寫入時再被 DB trigger 兜底檢查一次人數上限。不檢查訂閱狀態。
- 接受邀請：`app/(dashboard)/settings/actions.ts` 的 `acceptCaregiverInvitationAction`，任何登入者都能呼叫，實際限制交給 RLS（只能把自己的 `PENDING` 改成 `ACCEPTED`）。`acceptCaregiverInvitation()` 的 UPDATE 會 `.select('id')` 確認真的有更新到資料列——邀請如果已經被 owner 移除或已經處理過，RLS 會讓這個 UPDATE 比對 0 筆但不會回傳 error，不檢查回傳筆數的話會誤報成功（code review 抓到）。接受後要 `revalidatePath` 首頁/打卡/血檢頁，因為這個使用者能看到的貓整個變了。
- UI：邀請通知顯示在 `/settings` 主頁（`pending-invitations-section.tsx`），協作者管理顯示在 `/settings/caregivers`（owner-only，非 owner 存取會被導回 `/settings`）。

## 金流：綠界 ECPay 定期定額訂閱（現行，v1.0）

- CheckMacValue 簽章（SHA256 + ECPay 專用 URL encode 規則），已用官方測試向量驗證過實作正確性。
- `ReturnURL`（伺服器對伺服器，需回 `1|OK`）、`PeriodReturnURL`（第 2 期起扣款通知）、`OrderResultURL`（瀏覽器導回頁面，注意跟 `ClientBackURL` 不同，且要用 `request.nextUrl.origin` 而非 `Origin` header，因為這是跨站 POST）。
- 備援機制：`QueryCreditCardPeriodInfo` 手動查詢 API，因為 webhook 不保證一定送達（目前仍觀察到需要手動觸發查詢才會更新狀態的情況，根因尚未完全確認）。

## 主動提醒推播的基礎設施（規劃中，v1.2）

- 需要一組 VAPID 金鑰對（`web-push` 套件產生），公鑰給前端訂閱用、私鑰僅存在伺服器端環境變數。
- 排程觸發目前規劃用 Vercel Cron 打 `api/cron/send-reminders`。**Vercel Cron 的執行頻率上限依方案而異，需要在真正動工前先查證目前方案是否能達到需要的排程精細度（例如每 5–15 分鐘一次）**——這點目前沒有查證，不要假設現有方案一定支援，先確認再排入開發排程。
- iOS Safari 對 Web Push 有平台限制（需 iOS 16.4+，且僅限已加入主畫面的 PWA），需在提醒設定頁明確告知使用者裝置相容性。

詳細需求見 [../01-requirements/notification.md](../01-requirements/notification.md)。
