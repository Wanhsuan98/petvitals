# ⚠️ 本檔案已停用，請改看 docs/

這份單一大型 Spec 檔案（原本一路從 v1.0 累加到 v1.2）已經拆分成長期維護的文件結構，不再繼續更新。

保留這個檔案（沒有刪除）是為了讓任何還記得這個檔名或有舊書籤的人，能被導向到新的位置，而不是打開一個看起來還在維護、實際上已經過時的文件。

## 新的文件位置

從 [`README.md`](./README.md) 或直接進 [`docs/`](./docs/) 開始看：

| 原本的章節 | 新位置 |
| :--- | :--- |
| 專案核心摘要、Golden Path | [docs/00-product/overview.md](./docs/00-product/overview.md) |
| 範疇控制清單、訂閱分級 | [docs/00-product/scope.md](./docs/00-product/scope.md) |
| （多貓咪等）未來規劃 | [docs/00-product/roadmap.md](./docs/00-product/roadmap.md) |
| 各功能需求 | [docs/01-requirements/](./docs/01-requirements/) |
| Zod Schema / 資料契約 | [docs/02-data-contract/](./docs/02-data-contract/) |
| 臨床輔助與警戒演算法邏輯 | [docs/03-domain-logic/](./docs/03-domain-logic/) |
| 系統架構與路由設計 | [docs/04-architecture/](./docs/04-architecture/) |
| 訂閱分級與協作權限模型（v1.2） | [docs/05-decisions/](./docs/05-decisions/)、[docs/04-architecture/backend.md](./docs/04-architecture/backend.md) |
| 法律免責條款 | [docs/99-reference/medical-disclaimer.md](./docs/99-reference/medical-disclaimer.md) |
| 交付時程 (Milestones) | [docs/06-releases/](./docs/06-releases/) |

## 為什麼要拆

一份文件同時承擔 Product、Requirements、Data Contract、Architecture、Domain Logic、Legal、Milestones 太多職責，而且版本號（v1.0/v1.1/v1.2）綁在整份文件上，會導致沒有實際變動的內容（例如 `DailyCareLog` 的欄位定義）也要跟著整份複製一次。拆分後，**版本是 Release 的概念，不是文件的概念**：`docs/` 底下描述系統現在怎麼運作，`docs/06-releases/` 記錄某個時間點系統長什麼樣、改了什麼。
