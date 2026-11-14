export const HELP_TOPICS = [
  {
    code: 'faq',
    label: 'FAQ',
    category: 'Help center',
    description:
      'Jawaban singkat seputar pembelian akun, pembayaran, kredensial, dan garansi.',
  },
  {
    code: 'warranty',
    label: 'Warranty & refund',
    category: 'Support',
    description:
      'Cakupan garansi, cara klaim, dan proses refund untuk setiap pesanan.',
  },
  {
    code: 'terms-and-conditions',
    label: 'Terms & conditions',
    category: 'Legal',
    description:
      'Ketentuan pembelian akun, kepemilikan, dan batas tanggung jawab.',
  },
  {
    code: 'privacy',
    label: 'Privacy policy',
    category: 'Privacy',
    description:
      'Cara NexaPlay mengumpulkan, memakai, dan melindungi data pembeli.',
  },
] as const

export type HelpTopic = (typeof HELP_TOPICS)[number]

export function findHelpTopic(code: string): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.code === code)
}

export function helpHref(code: string): string {
  return `/pages/${code}`
}
