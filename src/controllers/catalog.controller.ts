// Server Actions for catalog master data (docs/API.md §5.1). Thin delegation only.

'use server'

import { catalogService } from '@/src/services/catalog.service'
import {
  revalidateGameCache,
  revalidateJenisGameCache,
} from '@/src/lib/cache/revalidate'
import type {
  GameCreateInput,
  GameUpdateInput,
  GameTypeCreateInput,
  GameTypeUpdateInput,
} from '@/src/validation/catalog'

export async function listGameTypesAdminAction() {
  return catalogService.listGameTypesAdmin()
}

export async function listGamesAdminAction() {
  return catalogService.listGamesAdmin()
}

export async function createGameTypeAction(input: GameTypeCreateInput) {
  const result = await catalogService.createGameType(input)
  if (result.ok) await revalidateJenisGameCache()
  return result
}

export async function updateGameTypeAction(input: GameTypeUpdateInput) {
  const result = await catalogService.updateGameType(input)
  if (result.ok) await revalidateJenisGameCache()
  return result
}

export async function createGameAction(input: GameCreateInput) {
  const result = await catalogService.createGame(input)
  if (result.ok) await revalidateGameCache()
  return result
}

export async function updateGameAction(input: GameUpdateInput) {
  const result = await catalogService.updateGame(input)
  if (result.ok) await revalidateGameCache()
  return result
}
