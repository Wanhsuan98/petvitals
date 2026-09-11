import { generateCheckMacValue, verifyCheckMacValue, type EcpayParams } from './check-mac-value'
import { ECPAY_PERIOD_ACTION_URL, getEcpayEnv } from './env'

// 定期定額訂單作業 API（Action=Cancel 終止後續扣款 / ReAuth 補授權）。
// 請求與回應都要驗證 CheckMacValue，回應是 URL-encoded 字串（不是 JSON）。
export async function cancelEcpayPeriodOrder(
  merchantTradeNo: string
): Promise<{ success: boolean; message: string }> {
  const { merchantId, hashKey, hashIv } = getEcpayEnv()

  const params: EcpayParams = {
    MerchantID: merchantId,
    MerchantTradeNo: merchantTradeNo,
    Action: 'Cancel',
    TimeStamp: String(Math.floor(Date.now() / 1000))
  }
  params.CheckMacValue = generateCheckMacValue(params, hashKey, hashIv)

  const response = await fetch(ECPAY_PERIOD_ACTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(10_000)
  })

  const bodyText = await response.text()
  const resultParams: EcpayParams = Object.fromEntries(new URLSearchParams(bodyText))

  if (!verifyCheckMacValue(resultParams, hashKey, hashIv)) {
    throw new Error('綠界回應的 CheckMacValue 驗證失敗，無法確認取消結果，請稍後再試或聯絡客服')
  }

  return {
    success: resultParams.RtnCode === '1',
    message: resultParams.RtnMsg ?? ''
  }
}
