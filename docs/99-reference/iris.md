# IRIS Reference

## Source

International Renal Interest Society (IRIS) 官方文件（www.iris-kidney.com），2026-10-16 由使用者提供 PDF：

- IRIS Staging of CKD（Modified 2026）：分期與次分期。
- Treatment Recommendation for CKD In Cats（2026）：血磷控制目標。

## Applicable Version

兩份文件皆為 **2026 版**，頁尾標示 ©2026 International Renal Interest Society (IRIS) Ltd.。

## Phosphorus Targets

| Stage   | Target Max (mg/dL) | 2026 治療建議原文依據                                                                                                   |
| :------ | -----------------: | :---------------------------------------------------------------------------------------------------------------------- |
| Stage 1 |                4.5 | 沒有 Stage 1 專屬的磷控制段落；Stage 1 的 Note c 提到「IRIS target (4.5 mg/dl)」，各期通則為維持在 4.5 以下、不低於 2.7 |
| Stage 2 |                4.5 | below 4.5 mg/dl（1.5 mmol/l）                                                                                           |
| Stage 3 |                5.0 | 「更實際的治療後目標」< 5.0 mg/dl（1.6 mmol/l）                                                                         |
| Stage 4 |                6.0 | 「更實際的治療後目標」< 6.0 mg/dl（1.9 mmol/l）                                                                         |

- 血磷高於上限時 IRIS 建議的下一步是加用磷結合劑（原文為 remains **above** 4.5／5／6 mg/dl），與程式「大於上限才警示」（`pValue > targetMax`）一致，因此恰好等於上限時不警示。
- IRIS 另建議長期血磷不要低於 2.7 mg/dL（0.9 mmol/l）；目前程式只檢查上限，不檢查下限。

## 比對紀錄

2026-10-16 逐項比對 2026 版官方 PDF，程式的 `thresholdMap`（4.5／4.5／5.0／6.0）與 2026 版完全一致，**不需要修改程式**。

過程中出現過的其他數值，都不採用：

- 較舊、無版本標示的 IRIS「Step 3: Treat CKD」圖寫 Stage 1／2 為 < 4.6；2026 版已是 4.5，以 2026 版為準。
- 網路衛教文章寫 Stage 4 為 5.0、正常血壓上限 150 mmHg；與 IRIS 官方文件（Stage 4 為 6.0、正常血壓 < 140）不符。
- 另一份未標示來源的表格寫下限為 2.5；IRIS 2026 為 2.7 mg/dL。

## 兩份 2026 文件之間的不一致（僅供未來參考）

貓的肌酸酐落在 Stage 3 範圍、SDMA 持續偏高時改依 Stage 4 處理的門檻，兩份文件寫法不同：

- 分期文件（涵蓋狗與貓，此處為 CATS 欄）：> 38 µg/dL
- 治療建議文件（貓專用）：> 35 µg/dL

分期文件中 > 35 是狗從 Stage 2 升到 Stage 3 的門檻，不是貓的 Stage 3 → 4。哪份有誤文件本身看不出來。目前產品不做自動分期，不受影響；如果未來要做「分期建議」，需要先向 IRIS 或獸醫師確認以哪個為準。

## Product Usage

PetVitals 僅將這些數值用於參考／警示呈現。應用程式不做 CKD 分期的自動診斷判定，`irisStage` 由使用者依獸醫診斷結果手動設定。

## Verification

- Last verified：2026-10-16，對照上述兩份 2026 版官方 PDF。
- Verified by：Claude 比對使用者提供的 IRIS 文件；⚠️ 尚未經獸醫師確認

## Update Policy

當 IRIS 指引更新時：

1. 更新本文件
2. 更新 `lib/clinical.ts` 裡的 `thresholdMap` 常數
3. 更新 `lib/clinical.test.ts` 的測試案例
4. 更新 `CHANGELOG.md`
5. 建立對應 release

## Related

- [../03-domain-logic/phosphorus.md](../03-domain-logic/phosphorus.md)
- [../02-data-contract/blood-test.md](../02-data-contract/blood-test.md)
