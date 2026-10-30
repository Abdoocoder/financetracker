/**
 * Bounded-concurrency helpers for cron routes.
 *
 * On the Supabase Nano tier the connection pool is tiny, so a cron that fans out
 * one request per row will exhaust it. These helpers cap how many round-trips are
 * in flight at once while keeping the per-item logic unchanged.
 */

/**
 * Runs `fn` over `items` in fixed-size batches, awaiting each batch before the
 * next one starts. Result order matches `items` order.
 *
 * Fail-fast: a rejection in any item aborts the whole run. Callers that want
 * per-item isolation (e.g. a push that may fail for one user) must catch inside
 * `fn` and return a sentinel value.
 */
export async function mapInBatches<T, R>(
  items: readonly T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>,
  pauseMs = 0
): Promise<R[]> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error(`mapInBatches: batchSize must be a positive integer, got ${batchSize}`)
  }

  const results: R[] = []
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize)
    const settled = await Promise.all(batch.map((item, offset) => fn(item, start + offset)))
    results.push(...settled)

    // Let the pool release connections before opening the next wave.
    if (pauseMs > 0 && start + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, pauseMs))
    }
  }

  return results
}
