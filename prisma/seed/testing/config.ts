// Fixed namespace + credentials for the test fixture seeder.

export const TEST_EMAIL_DOMAIN = '@nexaplay.test'
export const TEST_PASSWORD = process.env.TEST_SEED_PASSWORD ?? 'Test1234!'
export const SLUG_PREFIX = 'test-'
export const PROMO_PREFIX = '[TEST] '

export const VOUCHER_CODES = [
  'NEXA10',
  'NEXAHEMAT50K',
  'NEXAMAKS25K',
  'NEXAHABIS',
  'NEXAKEDALUWARSA',
  'NEXANONAKTIF',
] as const

export const PHOTOS = [
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1200&h=1450',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1200&h=1450',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1200&h=1450',
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1200&h=1450',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1200&h=1450',
]
