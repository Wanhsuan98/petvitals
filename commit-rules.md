# 專案 Commit Message 規範

這份文件是 AI 助理產出 Git Commit Message 的唯一標準。請在讀取 staged changes 後，嚴格依照以下格式與規則產出。

## 1. Commit Message 結構
必須嚴格遵守以下格式，括號與冒號之間需有一個半形空格：
```text
<type>(<scope>): <subject>

<body>
```

## 2. Type (類型) 限定清單
請依據程式碼的改動性質，選擇最適合的英文前綴：

| Type | 用途 |
|------|------|
| `feat` | 新功能或需求異動 |
| `fix` | 修 bug |
| `docs` | 文件、註解 |
| `refactor` | 重構（不影響功能、非為效能） |
| `perf` | 效能改善 |
| `test` | 測試相關 |
| `build` | 建構系統、套件相依 |
| `ci` | CI/CD 設定 |
| `chore` | 雜務（不動 src 與 test） |
| `revert` | 撤銷先前 commit |

## 3. 撰寫規則 (Rules)
- Scope (影響範圍)：（選填）請填寫被修改的元件、頁面或模組名稱（如 Header, auth, api）。若影響範圍廣泛，可省略此項。

- Subject (標題)：

必須使用英文簡要說明。

控制在 50 個字元以內，精準表達改動目的。


- Body (內文)：

若改動較為複雜，請換行並提供 Body 說明。

以條列式說明「為什麼要做這個改動」或「解決了什麼問題」，幫助未來的自己與團隊快速理解。

絕對禁止廢話：請直接輸出 Markdown 格式的 Commit Message，不要加上「好的，我幫你生成...」等對話贅字。輸出完成後，請直接詢問我：「是否要由我直接為您執行 git commit？」。