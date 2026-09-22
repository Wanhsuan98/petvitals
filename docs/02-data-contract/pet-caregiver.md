# PetCaregiver

Status: Implemented
Introduced: v1.2.0

## Purpose

記錄一隻貓的協作者邀請狀態，供 RLS 政策判斷存取權限。

**這張表只存被邀請的協作者，不存 owner 自己**——owner 的權限本來就來自 `cat_profiles.owner_id`，不需要在這裡重複存一筆，也避免多一個「角色欄位」帶來的權限升級風險（實作時原本設計了 `role: OWNER | CAREGIVER` enum，後來拿掉了，理由見下方 Business Rules）。

## Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | No | Record ID |
| petId | UUID | Yes | Cat profile ID |
| userId | UUID | Yes | 綁定 `auth.users.id`，被邀請的協作者帳號 |
| status | enum | Yes | `PENDING` \| `ACCEPTED`，預設 `PENDING` |
| invitedEmail | string (email) | Yes | 邀請當下輸入的 email，供尚未接受邀請時顯示狀態 |
| invitedAt | datetime | No | 邀請時間 |
| acceptedAt | datetime | No | 接受邀請時間 |

`(petId, userId)` 有唯一約束，避免同一人被同一隻貓重複邀請。

## Validation

- `invitedEmail`：合法 email 格式

## Business Rules

- 每隻貓最多 `MAX_CAREGIVERS_PER_PET`（= 3，owner 隱含算 1 人 + 本表 `PENDING`/`ACCEPTED` 筆數），跟訂閱狀態無關（這個功能永久免費，見 [ADR-002](../05-decisions/ADR-002-subscription-tier-model.md) 的 Update）。**同時在應用層跟 DB 層檢查**：應用層只是先做一次友善的預先檢查，真正擋住併發邀請超過上限的是 `before insert` trigger `enforce_caregiver_cap`（用 `pg_advisory_xact_lock` 序列化同一隻貓的併發新增，避免兩個併發邀請都通過預先檢查、都寫入成功）。這個數字目前在 `lib/schemas.ts` 跟 trigger 裡各寫一份，調整上限要兩邊一起改。
- 只有 owner（`cat_profiles.owner_id = auth.uid()`）能新增/移除協作者。被邀請者只能把自己那筆從 `PENDING` 改成 `ACCEPTED`（接受邀請），且有 DB trigger 擋下 `petId`/`userId` 被偷改——這是實作時抓到的真實風險：如果 `with check` 只驗證 `status`/`userId`，被邀請者理論上可以在同一次 UPDATE 裡把 `petId` 改成自己從未受邀的另一隻貓，變相取得存取權。
- `invitedEmail` 的比對用 `lower()` 不分大小寫，避免 owner 輸入的大小寫跟帳號實際註冊的不同時查不到人。

## Related Requirements

- [caregivers.md](../01-requirements/caregivers.md)

## Related Decisions

- [ADR-002](../05-decisions/ADR-002-subscription-tier-model.md)
- [ADR-003](../05-decisions/ADR-003-caregiver-cap.md)
