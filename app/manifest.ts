import type { MetadataRoute } from 'next'

import { BRAND_COLOR } from '@/lib/constants'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PetVitals',
    short_name: 'PetVitals',
    description: '慢性腎病貓咪居家照護紀錄與回診報告工具',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: BRAND_COLOR,
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ]
  }
}
