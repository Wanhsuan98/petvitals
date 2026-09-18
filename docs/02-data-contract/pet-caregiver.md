# PetCaregiver

Status: Planned
Introduced: v1.2.0（尚未動工）

## Purpose

記錄一隻貓與其協作者（含 owner 本人）之間的關係與邀請狀態，供 RLS 政策判斷存取權限。

## Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | No | Record ID |
| petId | UUID | Yes | Cat profile ID |
| userId | UUID | Yes | 綁定 `auth.users.id`，被邀請的協作者帳號 |
| role | enum | Yes | `OWNER` \| `CAREGIVER` |
| status | enum | Yes | `PENDING` \| `ACCEPTED`，預設 `PENDING` |
| invitedEmail | string (email) | Yes | 邀請當下輸入的 email，供尚未接受邀請時顯示狀態 |
| invitedAt | datetime | No | 邀請時間 |
| acceptedAt | datetime | No | 接受邀請時間 |

## Validation

- `invitedEmail`：合法 email 格式

## Business Rules

- 每隻貓最多 `MAX_CAREGIVERS_PER_PET`（= 3，含 owner 本人）筆 `ACCEPTED` 關係，達上限時邀請在應用層被擋下，不需要 DB constraint。
- 只有 `role = OWNER` 的使用者能寫入本表（邀請/移除協作者），`CAREGIVER` 角色沒有寫入權限。
- 訂閱取消/失效後：資料列保留（不刪除邀請關係），但 RLS 政策額外檢查訂閱狀態——僅 owner 永久保有存取，第 2 位起的 caregiver 在非訂閱期間查詢會被擋下，訂閱恢復後自動復權。

## Related Requirements

- [caregivers.md](../01-requirements/caregivers.md)

## Related Decisions

- [ADR-002](../05-decisions/ADR-002-subscription-tier-model.md)
- [ADR-003](../05-decisions/ADR-003-caregiver-cap.md)
