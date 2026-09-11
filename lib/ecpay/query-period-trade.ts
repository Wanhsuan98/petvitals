import { generateCheckMacValue, type EcpayParams } from './check-mac-value'
import { ECPAY_QUERY_PERIOD_URL, getEcpayEnv } from './env'

// 定期定額訂單查詢 API 的回應是 JSON，且回應本身不帶 CheckMacValue（跟 CreditCardPeriodAction
// 不同）。這是安全的：我們是主動對 ECPay 的網域發出 HTTPS 請求，真實性由 TLS 保證，
// 不像收到的 webhook 那樣可能被任何人偽造，所以不需要額外簽章驗證回應。
export type EcpayPeriodTradeResult = {
  rtnCode: number
  execStatus: '0' | '1' | '2' | string // 0=已終止 1=執行中 2=執行完成
  totalSuccessTimes: number
  latestGwsr: string | null
}

type ExecLogEntry = {
  Gwsr?: string | number
  gwsr?: string | number
}

export async function queryEcpayPeriodTrade(
  merchantTradeNo: string
): Promise<EcpayPeriodTradeResult> {
  const { merchantId, hashKey, hashIv } = getEcpayEnv()

  const params: EcpayParams = {
    MerchantID: merchantId,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: String(Math.floor(Date.now() / 1000))
  }
  params.CheckMacValue = generateCheckMacValue(params, hashKey, hashIv)

  const response = await fetch(ECPAY_QUERY_PERIOD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(10_000)
  })

  const result = (await response.json()) as {
    RtnCode: number
    ExecStatus: string
    TotalSuccessTimes: number
    ExecLog?: ExecLogEntry[]
  }

  const lastLog = result.ExecLog?.[result.ExecLog.length - 1]
  const latestGwsr = lastLog ? String(lastLog.Gwsr ?? lastLog.gwsr ?? '') || null : null

  return {
    rtnCode: result.RtnCode,
    execStatus: result.ExecStatus,
    totalSuccessTimes: result.TotalSuccessTimes,
    latestGwsr
  }
}
