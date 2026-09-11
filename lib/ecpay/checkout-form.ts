import type { EcpayParams } from './check-mac-value'

// 產生自動送出的 HTML 表單，瀏覽器載入後會立刻 POST 到 ECPay 收銀台頁面。
// ECPay 的 AioCheckOut 端點只接受 Form POST，不能用一般的 HTTP redirect 導過去。
export function buildAioCheckoutHtml(actionUrl: string, params: EcpayParams): string {
  const inputs = Object.entries(params)
    .map(
      ([key, value]) =>
        `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`
    )
    .join('\n')

  return `<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="utf-8" />
    <title>正在導向付款頁面...</title>
  </head>
  <body onload="document.forms[0].submit()">
    <p>正在導向綠界付款頁面，請稍候...</p>
    <form method="POST" action="${escapeHtml(actionUrl)}">
      ${inputs}
    </form>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
