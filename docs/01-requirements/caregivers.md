# 多照護者協作 (Caregivers)

Status: Planned
Introduced: v1.2.0 (Change Proposal，尚未動工)

## Purpose

慢性病貓的照護常常是家人分工（白天/晚上換班打針、假日換人顧），單一帳號綁定會低估真實的照護需求。這個功能讓一隻貓的照護資料可以由多人共同存取。

## Behavior

- 飼主（owner）可透過 email 邀請其他已註冊的 PetVitals 帳號成為同一隻貓的照護者（caregiver），共同查看與新增每日照護日誌、血檢紀錄。
- 累積口碑階段先訂一個固定上限：**每隻貓最多 3 位協作者（含 owner 本人）**，做成常數（`MAX_CAREGIVERS_PER_PET`）而非分級方案，之後依實際使用回饋再評估要不要拆分更高階方案。決策脈絡見 [ADR-003](../05-decisions/ADR-003-caregiver-cap.md)。
- 僅 owner 可以邀請/移除協作者、管理訂閱與刪除貓咪資料；caregiver 僅能讀寫日常照護資料，不能異動訂閱或邀請他人。
- 此功能綁定訂閱狀態：訂閱中才能新增第 2 位起的協作者；訂閱取消或失效後，既有資料保留，但第 2 位起的協作者立即失去存取權限，僅 owner 保留完整存取（軟性降級，不刪除資料）。

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
- 決策紀錄：[ADR-002](../05-decisions/ADR-002-subscription-tier-model.md)、[ADR-003](../05-decisions/ADR-003-caregiver-cap.md)
- 變更提案：[../06-releases/v1.2.0.md](../06-releases/v1.2.0.md)
