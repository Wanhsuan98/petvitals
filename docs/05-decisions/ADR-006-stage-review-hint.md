# ADR-006: 血檢數值偏高時只提示確認分期，不自動分期

Status: Accepted
Introduced: v1.2.0

## Context

`CatProfile.irisStage` 由使用者手動設定，血磷警示依這個分期判斷。使用者新增血檢後，如果肌酸酐或 SDMA 已明顯進入更高分期的區間，分期卻沒有更新，血磷會用偏寬鬆或偏嚴格的標準判斷，使用者也可能沒意識到該回診確認分期。

## Decision

新增 `evaluateStageHint()`，血檢頁顯示提示，**不自動修改分期**：

1. 只提示「更高」的分期，不提示降級。數值變好可能來自輸液、飲水狀態或治療，改分期是獸醫師的判斷。
2. 只看最新一筆血檢。單次數值本來就不足以分期，歷史趨勢留給圖表。
3. 肌酸酐與 SDMA 取較高者，與 IRIS 2026 兩項不一致時的建議一致。
4. 文字用「可能需要和獸醫師確認」，不使用診斷語氣，並註明單次數值不能決定分期。

不做自動分期的原因：IRIS 分期要求飲水充足、狀態穩定、多次檢驗，系統無法判斷這些條件；自動分期會把產品推向醫療診斷，與 [醫療免責聲明](../99-reference/medical-disclaimer.md) 的定位衝突。

## Consequences

- 提示可能對尚在脫水或剛輸液前後抽血的單次偏高數值誤報；提示文字已說明單次數值的限制。
- 分期區間在程式與 [iris.md](../99-reference/iris.md) 各一份，IRIS 更新指引時要一起改（見該文件 Update Policy）。
- 兩份 2026 IRIS 文件對貓「第 3 期升第 4 期」的 SDMA 門檻寫法不同（>38 與 >35），目前不做 SDMA 差異分期所以不受影響，見 iris.md。

## Related

- [Stage Review Hint](../03-domain-logic/stage-hint.md)
- [IRIS Reference](../99-reference/iris.md)
