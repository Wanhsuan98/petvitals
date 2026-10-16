# 生化血檢管理 (Blood Test)

Status: Implemented
Introduced: v1.0.0

## Purpose

讓照顧者歸檔每次回診的生化血檢報告，並依貓咪目前的 IRIS 分期自動提示血磷是否超標。

## Behavior

- 支援 5 項核心指標記錄：BUN、Creatinine、SDMA、Phosphorus (P)、HCT。
- 使用者依獸醫診斷結果手動設定/更新 IRIS 分期，系統依所選分期自動比對對應血磷控制上限並提示（非系統自動診斷判定）。
- 最新一筆血檢的肌酸酐或 SDMA 落在比目前設定更高的 IRIS 分期區間時，血檢頁會顯示「可能需要和獸醫師確認分期」的提示，不會自動修改分期，也不會提示降級，見 [../03-domain-logic/stage-hint.md](../03-domain-logic/stage-hint.md)。

## Related Documents

- 資料契約：[../02-data-contract/blood-test.md](../02-data-contract/blood-test.md)、[../02-data-contract/cat-profile.md](../02-data-contract/cat-profile.md)
- Domain Logic：[../03-domain-logic/phosphorus.md](../03-domain-logic/phosphorus.md)、[../03-domain-logic/stage-hint.md](../03-domain-logic/stage-hint.md)
- 參考標準：[../99-reference/iris.md](../99-reference/iris.md)
