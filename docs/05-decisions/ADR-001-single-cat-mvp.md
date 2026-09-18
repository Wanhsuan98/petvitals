# ADR-001: MVP 限制一人一貓

Status: Accepted（v1.0），前向路徑規劃中（v1.2，見下方 Update）

## Context

MVP 開發時程僅 4 週，多隻貓咪管理需要額外的貓咪切換 UI、以及所有既有頁面隱含的「使用者只有一隻貓」假設都要改掉（`requireCatProfile()` 等輔助函式需要改為接受 `petId` 參數而非隱含推斷）。這在時程壓力下不是高優先項目。

## Decision

`cat_profiles.owner_id` 加上資料庫層級 `unique` 約束（`cat_profiles_owner_id_key`），一個帳號只能有一筆貓咪檔案。這是硬性約束，不只是 UI 層面的限制。

## Consequences

- 好處：大幅簡化 v1.0 的資料模型與頁面邏輯，所有查詢都可以用 `owner_id` 直接定位貓咪，不需要處理「選擇哪隻貓」的狀態。
- 代價：多貓家庭（例如同時養兩隻慢性腎病貓）在 v1.0/v1.1/v1.2 完全無法使用本產品管理第二隻貓。

## Update (v1.2)

產品討論中重新評估：多隻貓咪應該作為訂閱 Pro 的進階功能開放，而不是永久排除。已將前向相容設計記錄在 [../00-product/roadmap.md](../00-product/roadmap.md)，包含移除 unique constraint 的步驟。本次（v1.2）僅記錄路徑，不實際動 migration。
