// How long a contract has sat in its stage against the stage's target, as
// the list and the board both say it.

/** Days past the stage's target, or null when on time or without a target. */
export function daysPastTarget(days: number, target: number | null | undefined): number | null {
  return target && target > 0 && days > target ? days - target : null
}
