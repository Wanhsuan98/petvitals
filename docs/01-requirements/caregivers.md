# 多照護者協作 (Caregivers)

Status: Implemented
Introduced: v1.2.0

## Purpose

慢性病貓的照護常常是家人分工（白天/晚上換班打針、假日換人顧），單一帳號綁定會低估真實的照護需求。這個功能讓一隻貓的照護資料可以由多人共同存取。

## Behavior

- 飼主（owner）可透過 email 邀請其他已註冊的 PetVitals 帳號成為同一隻貓的照護者（caregiver），共同查看與新增每日照護日誌、血檢紀錄。
- 累積口碑階段先訂一個固定上限：**每隻貓最多 3 位協作者（含 owner 本人）**，做成常數（`MAX_CAREGIVERS_PER_PET`）而非分級方案，之後依實際使用回饋再評估要不要拆分更高階方案。決策脈絡見 [ADR-003](../05-decisions/ADR-003-caregiver-cap.md)。已達上限時，`settings/caregivers` 頁面會直接把邀請表單換成提示文字（不是讓使用者填完送出才在伺服器端擋下），伺服器端（應用層預先檢查 + DB trigger 兜底）仍然是實際把關的地方，前端只是提早給回饋。
- 飼主與協作者對每日照護日誌、血檢紀錄有相同的**新增、編輯、刪除**權限（讓照顧責任平均分攤，見 [ADR-007](../05-decisions/ADR-007-caregivers-edit-delete-care-data.md)；先前曾限制協作者不能刪除，已由該 ADR 取代）。僅 owner 可以修改貓咪資料、邀請/移除協作者、管理提醒排程。（目前 App 沒有刪除貓咪的功能；資料庫權限上只有 owner 能刪除。）目前沒有修改/刪除的稽核紀錄。
- 這個功能永久免費，不綁定訂閱狀態（原本規劃成訂閱才能用，開發期間改為永久免費，見 [ADR-002](../05-decisions/ADR-002-subscription-tier-model.md) 的 Update）。
- **單貓模式下一個帳號只能照顧一隻貓**（擁有的貓 + 已接受協作的貓合計一隻）：受邀者已在照顧一隻貓時，送出邀請與接受邀請都會被擋下並顯示「目前一個帳號只能照顧一隻貓」；已是協作者的帳號也不能再建立自己的貓咪資料。這是過渡限制，v1.3 多隻貓咪管理上線時移除，見 [ADR-005](../05-decisions/ADR-005-single-cat-caregiver-guard.md)。
- 通知中心 `/notifications` 與設定頁均可查看及接受本人待處理邀請；沒有貓咪資料的登入者也能使用。接受成功後刷新通知中心、首頁角標、設定與提醒頁。

## Invitation Flow

```
[owner 於 settings/caregivers 輸入 email] ──► 建立 pet_caregivers (status=PENDING)
        │
        ▼
[受邀者登入/註冊 PetVitals] ──► 看到待接受邀請通知 ──► 按下接受 ──► status 改為 ACCEPTED，取得存取權
```

- 受邀 email 若尚未有 PetVitals 帳號，需先完成登入/註冊（沿用現有 Magic Link / Google 登入），邀請以 email 比對，不做站外邀請連結（降低本次範圍複雜度）。

## Related Documents

- 資料契約：[../02-data-contract/pet-caregiver.md](../02-data-contract/pet-caregiver.md)
- 權限與 RLS 設計：[../04-architecture/backend.md](../04-architecture/backend.md)
- 決策紀錄：[ADR-002](../05-decisions/ADR-002-subscription-tier-model.md)、[ADR-003](../05-decisions/ADR-003-caregiver-cap.md)、[ADR-005](../05-decisions/ADR-005-single-cat-caregiver-guard.md)、[ADR-007](../05-decisions/ADR-007-caregivers-edit-delete-care-data.md)
- 變更提案：[../06-releases/v1.2.0.md](../06-releases/v1.2.0.md)
