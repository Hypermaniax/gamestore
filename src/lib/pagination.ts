export const PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 10
export type PageSize = (typeof PAGE_SIZES)[number]

export function parsePageSize(value: string | undefined): PageSize {
  const parsed = Number(value)
  return PAGE_SIZES.includes(parsed as PageSize) ? (parsed as PageSize) : DEFAULT_PAGE_SIZE
}
