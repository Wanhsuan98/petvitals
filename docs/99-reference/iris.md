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
- IRIS 另建議長期血磷不要低於 2.7 mg/dL（0.9 mmol/l），各期相同。程式已在 ADR-011 第 1 階段加入下限檢查（`PHOSPHORUS_TARGET_MIN_MG_DL`），低於 2.7 顯示「低於控制目標」，見 [phosphorus.md](../03-domain-logic/phosphorus.md)。

## 比對紀錄

2026-10-16 逐項比對 2026 版官方 PDF，程式的 `thresholdMap`（4.5／4.5／5.0／6.0）與 2026 版完全一致，**不需要修改程式**。

過程中出現過的其他數值，都不採用：

- 較舊、無版本標示的 IRIS「Step 3: Treat CKD」圖寫 Stage 1／2 為 < 4.6；2026 版已是 4.5，以 2026 版為準。
- 網路衛教文章寫 Stage 4 為 5.0、正常血壓上限 150 mmHg；與 IRIS 官方文件（Stage 4 為 6.0、正常血壓 < 140）不符。
- 另一份未標示來源的表格寫下限為 2.5；IRIS 2026 為 2.7 mg/dL。

## Substaging（子分期，貓）

出處：IRIS Staging of CKD（Modified 2026）第 4–5 頁，2026-11-27 由使用者再次提供 PDF，逐項比對後記錄。下表只列**貓**的數值；狗的 UPC 門檻不同（0.2–0.5），本產品不使用。

### 蛋白尿（UP/C，2a. Substaging by Proteinuria）

| UP/C（貓） | 子分期                         |
| :--------- | :----------------------------- |
| < 0.2      | Non-proteinuric（無蛋白尿）    |
| 0.2 – 0.4  | Borderline proteinuric（臨界） |
| > 0.4      | Proteinuric（蛋白尿）          |

- 邊界值：0.2 與 0.4 都屬於「臨界」，大於 0.4 才是「蛋白尿」。
- 前提條件：要先排除腎前性與腎後性原因；沒有泌尿道發炎或出血；並已由血漿蛋白檢驗排除異常蛋白血症。
- 子分期最好依據**至少兩次、間隔至少 2 週**的尿液樣本。
- 持續臨界者建議 **2 個月內**重新評估。
- IRIS 也提到試紙（dipstick）可能不夠敏感，建議使用 UP/C 或物種專用的白蛋白尿檢驗。

### 血壓（收縮壓，2b. Substaging by Blood pressure）

適用於大多數狗與**所有貓**：

| 收縮壓（mmHg） | 子分期                              | 未來標的器官受損風險 |
| :------------- | :---------------------------------- | :------------------- |
| < 140          | Normotensive（血壓正常）            | Minimal（極低）      |
| 140 – 159      | Prehypertensive（高血壓前期）       | Low（低）            |
| 160 – 179      | Hypertensive（高血壓）              | Moderate（中）       |
| ≥ 180          | Severely hypertensive（嚴重高血壓） | High（高）           |

- 量測前要讓動物適應環境，並量測多次。
- 最終分類應依據**多次**收縮壓量測，最好是不同天的回診；同一次回診也可以，但兩次量測要間隔至少 2 小時。
- 判斷是否「持續」偏高，應在 1–2 週內的不同回診量測；血壓越高，判斷的時間應越短。
- 狗的「高血壓品種」（例如視覺獵犬）另有依品種參考區間調整的規則，不適用於貓，本產品不使用。

### 治療中的標示與重新分類（3. Revision of staging and substaging after treatment）

- 已經開始降血壓或降蛋白尿治療的病患，重新評估時依新的數值分類，並加註「treating（治療中）」，例如「Stage 2, non-proteinuric, prehypertensive (treating)」。
- 肌酸酐或 SDMA 明顯上升時，可能需要重新分到更高的期別。

### 其他與產品有關的註記

- **SDMA 的檢驗方法**：IRIS 的 SDMA 建議是依 IDEXX 專利方法的文獻訂定，其他實驗室的 SDMA 檢驗方法尚未標準化，不確定結果是否相同。這支持 ADR-011「保存儀器或檢驗方法」的設計。
- **品種差異**：健康的伯曼貓（Birman）SDMA 與肌酸酐都可能較高，最多約 20% 會超出檢驗室參考區間。產品目前沒有記錄品種，暫不處理。
- **單位換算的小差異**：分期表貓的第 2 期肌酸酐為 140–250 µmol/L，但「Discrepancies」段落寫「between 141 and 250 µmol/l」。mg/dL 都是 1.6–2.8，產品使用 mg/dL，不受影響。

## 兩份 2026 文件之間的不一致（僅供未來參考）

貓的肌酸酐落在 Stage 3 範圍、SDMA 持續偏高時改依 Stage 4 處理的門檻，兩份文件寫法不同：

- 分期文件（涵蓋狗與貓，此處為 CATS 欄）：> 38 µg/dL
- 治療建議文件（貓專用）：> 35 µg/dL

分期文件中 > 35 是狗從 Stage 2 升到 Stage 3 的門檻，不是貓的 Stage 3 → 4。哪份有誤文件本身看不出來。目前產品不做自動分期，不受影響；如果未來要做「分期建議」，需要先向 IRIS 或獸醫師確認以哪個為準。

## Product Usage

PetVitals 僅將這些數值用於參考／警示呈現。應用程式不做 CKD 分期的自動診斷判定，`irisStage` 由使用者依獸醫診斷結果手動設定。

## Verification

- Last verified：2026-10-16，對照上述兩份 2026 版官方 PDF；子分期（Substaging）於 2026-11-27 對照分期文件 PDF 補錄。
- 2026-11-27 再次核對分期文件第 3 頁：貓的肌酸酐在第 3 期範圍、SDMA 持續 > 38 µg/dL 時依第 4 期處理，與上方「不一致」段落記錄的分期文件寫法相同。
- Verified by：Claude 比對使用者提供的 IRIS 文件；⚠️ 尚未經獸醫師確認

## Update Policy

當 IRIS 指引更新時：

1. 更新本文件
2. 更新 `lib/clinical.ts` 裡的 `PHOSPHORUS_TARGET_MAX_MG_DL`、`PHOSPHORUS_TARGET_MIN_MG_DL` 常數
3. 更新 `lib/clinical.test.ts` 的測試案例
4. 更新 `CHANGELOG.md`
5. 建立對應 release

## Related

- [../03-domain-logic/phosphorus.md](../03-domain-logic/phosphorus.md)
- [../02-data-contract/blood-test.md](../02-data-contract/blood-test.md)
