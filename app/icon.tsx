import { ImageResponse } from 'next/og'

import { BRAND_COLOR } from '@/lib/constants'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        background: BRAND_COLOR,
        borderRadius: 8
      }}
    >
      🐾
    </div>,
    size
  )
}
