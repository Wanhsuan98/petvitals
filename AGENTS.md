<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# PetVitals 專案規範

## 1. Coding Style

- 字串一律使用單引號 (`'`)，允許 Template Literals；句尾不使用分號；物件/陣列最後一個值不加逗號。**這幾條已經由 `.prettierrc` 機械強制執行，不需要額外注意，`pnpm format` 會自動處理。**
- **嚴格型別安全**：全面禁止使用 `any` 型別。若遇到複雜型別，優先使用 `unknown` 搭配 Type Guard，或宣告完整的 Interface/Type。這條目前**不是**由 eslint 規則機械強制的，純靠人工把關，寫程式碼與 review 時都要主動注意。
- 變數與函式命名需具備清晰語意，布林值建議以 `is`/`has`/`should` 開頭。

## 2. Code Review SOP

- **觸發條件**：提示詞包含「review」、「幫我看 code」、「檢查 [檔案名稱]」等關鍵字。
- **執行動作**：讀取專案根目錄下的 `code-review.md`，嚴格依照裡面的六步驟 Checklist 執行深度審查。

## 3. Commit SOP

- **觸發條件**：要求「幫我 commit」、「產生 commit message」或「紀錄改動」時。
- **執行動作**：
  1. 讀取目前 staged 的改動內容（`git diff --cached`）。
  2. 讀取專案根目錄下的 `commit-rules.md`，依裡面的格式規則產出 commit message。
  3. 產出訊息後先詢問「是否要由我直接為您執行 git commit？」，取得確認後才真的執行 `git commit`——不要在同一步就直接送出。

## 4. GitLab 開發起手式 SOP

- **觸發條件**：提示詞包含「Issue[數字]」、「開工 Issue[數字]」或「處理 Issue」時。
- **執行動作**：0. 若當前 session 找不到 GitLab MCP 工具，立即停止並提醒使用者檢查 MCP 設定與 session 是否已重啟，不要用其他方式（如 curl 猜測 token）繞過。
  1. 讀取指定 Issue 編號的標題與描述內容。
  2. 依內容判斷任務屬性（`feat`/`fix`/`refactor`/`chore` 等）。
  3. 依序執行：`git checkout main` → `git pull origin main` → `git checkout -b <屬性>/issue<數字>`。
  4. 回報已建立並切換的分支名稱，並用一句話總結該 Issue 的核心目標，詢問是否可以開始寫 Code。

## 5. 文件同步 SOP（v1.2.0 新增）

`docs/` 底下的文件（`00-product` ~ `99-reference`）是這個專案「系統現在怎麼運作」的唯一真相來源，不是寫完就放著的靜態文件。程式碼與這套文件脫節，會比完全沒有文件更糟——文件會變成一個看起來權威、但內容錯誤的陷阱。

- **新增/調整一個功能的行為、資料欄位、或商業邏輯時**：同一次改動要一併更新對應的文件，不要留到之後才補：
  - 影響使用者可見行為 → 更新 `docs/01-requirements/`
  - 影響 Zod schema / 資料表欄位 → 更新 `docs/02-data-contract/`
  - 影響臨床/計算邏輯 → 更新 `docs/03-domain-logic/`
  - 影響路由、RLS、金流、推播等架構 → 更新 `docs/04-architecture/`
- **功能從規劃變成真的做完時**：把對應文件的 `Status: Planned` 改成 `Implemented`，補上 `Introduced: vX.Y.Z`。
- **做了一個非顯而易見的取捨決策時**（例如訂閱要不要鎖免費功能、某個上限訂多少）：在 `docs/05-decisions/` 新增一份 ADR，不要只寫在 commit message 裡就消失。
- **版本是 Release 的概念，不是文件的概念**：不要複製整份文件變成 `xxx-v1.3.md`。`docs/06-releases/` 只放該版本的交付摘要／Change Proposal，實際內容永遠只活在一份文件裡。
- 小改動、跟 `docs/` 現有內容無關的調整（例如純粹的樣式微調、內部重構不影響行為）不需要為了同步而同步，不要為了流程而製造沒有資訊量的文件異動。
