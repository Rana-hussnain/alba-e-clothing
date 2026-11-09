import { db } from '@/lib/db'

/**
 * Stock control. A product's `stock` is its number of pieces; `null` means "not tracked" (always available).
 * Reserving is atomic per product: the database only subtracts when enough pieces are left, so two customers
 * can never both buy the last piece.
 */
export interface StockLine {
  productId: string
  qty: number
}

/** Merge lines of the same product (e.g. two sizes) into one. */
export function mergeLines(lines: StockLine[]): StockLine[] {
  const map = new Map<string, number>()
  for (const l of lines) map.set(l.productId, (map.get(l.productId) ?? 0) + l.qty)
  return [...map].map(([productId, qty]) => ({ productId, qty }))
}

export type ReserveResult = { ok: true; reserved: StockLine[] } | { ok: false; productName: string; left: number }

/** Subtract stock for every tracked product, or change nothing at all if any of them is short. */
export async function reserveStock(lines: StockLine[]): Promise<ReserveResult> {
  const reserved: StockLine[] = []
  for (const line of mergeLines(lines)) {
    const product = await db.product.findUnique({ where: { id: line.productId }, select: { name: true, stock: true } })
    if (!product || product.stock === null) continue // not tracked
    const done = await db.product.updateMany({
      where: { id: line.productId, stock: { gte: line.qty } },
      data: { stock: { decrement: line.qty } },
    })
    if (done.count !== 1) {
      await releaseStock(reserved) // put back what we already took
      const fresh = await db.product.findUnique({ where: { id: line.productId }, select: { stock: true } })
      return { ok: false, productName: product.name, left: Math.max(0, fresh?.stock ?? 0) }
    }
    reserved.push(line)
  }
  return { ok: true, reserved }
}

/** Give stock back (order cancelled / failed to save). Only touches products that track stock. */
export async function releaseStock(lines: StockLine[]): Promise<void> {
  for (const line of mergeLines(lines)) {
    await db.product
      .updateMany({ where: { id: line.productId, stock: { not: null } }, data: { stock: { increment: line.qty } } })
      .catch((e) => console.error('stock release failed:', e))
  }
}

/** The stock lines of an existing order (from its saved items). */
export function linesOfOrder(itemsJson: string): StockLine[] {
  try {
    const items = JSON.parse(itemsJson) as Array<{ productId?: string; qty?: number }>
    return items
      .filter((i) => typeof i.productId === 'string' && Number.isInteger(i.qty) && (i.qty as number) > 0)
      .map((i) => ({ productId: i.productId as string, qty: i.qty as number }))
  } catch {
    return []
  }
}
