// ECPay 的 MerchantID/HashKey/HashIV 屬於真正的機密資料（可用來偽造付款成功通知），
// 一律只在 server 端讀取，絕對不能加上 NEXT_PUBLIC_ 前綴。
// 開發階段預設值是綠界官方公開的測試帳號，方便本機開發不必等正式審核。
const TEST_MERCHANT_ID = '3002607'
const TEST_HASH_KEY = 'pwFHCqoQZGmho4w6'
const TEST_HASH_IV = 'EkRm7iFT261dpevs'

// 上線前記得改成正式環境網址，見 guides/16-go-live-checklist.md
export const ECPAY_AIO_CHECKOUT_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
export const ECPAY_PERIOD_ACTION_URL =
  'https://payment-stage.ecpay.com.tw/Cashier/CreditCardPeriodAction'
export const ECPAY_QUERY_PERIOD_URL =
  'https://payment-stage.ecpay.com.tw/Cashier/QueryCreditCardPeriodInfo'

export function getEcpayEnv() {
  const merchantId = process.env.ECPAY_MERCHANT_ID
  const hashKey = process.env.ECPAY_HASH_KEY
  const hashIv = process.env.ECPAY_HASH_IV

  // 正式環境絕對不能悄悄退回公開的測試帳號——那組測試信用卡卡號是公開的，
  // 一旦不小心用測試帳號跑正式站，任何人都能用測試卡「免費訂閱成功」
  if (process.env.NODE_ENV === 'production') {
    if (!merchantId || !hashKey || !hashIv) {
      throw new Error(
        '正式環境缺少 ECPAY_MERCHANT_ID / ECPAY_HASH_KEY / ECPAY_HASH_IV，請確認 Vercel 環境變數設定'
      )
    }
    return { merchantId, hashKey, hashIv }
  }

  return {
    merchantId: merchantId || TEST_MERCHANT_ID,
    hashKey: hashKey || TEST_HASH_KEY,
    hashIv: hashIv || TEST_HASH_IV
  }
}
