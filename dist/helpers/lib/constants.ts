import { colorize } from './colorize.js'

/**
 * Symbol indicating a successful operation, rendered in green.
 *
 * @example
 * ```ts
 * console.log(`${symbol_done} Build finished`)
 * // ✔ Build finished  (with ✔ in green)
 * ```
 */
export const symbol_done = colorize.Green('✔')

/**
 * Symbol indicating a failed operation, rendered in red.
 *
 * @example
 * ```ts
 * console.error(`${symbol_fail} Build failed`)
 * // ✘ Build failed  (with ✘ in red)
 * ```
 */
export const symbol_fail = colorize.Red('✘')

/**
 * Symbol for a neutral / informational state, rendered in yellow.
 *
 * Useful for warnings, skips, or notices that are neither pass nor fail.
 *
 * @example
 * ```ts
 * console.log(`${symbol_neutral} Skipping optional step`)
 * // 🙼 Skipping optional step  (with 🙼 in yellow)
 * ```
 */
export const symbol_neutral = colorize.Yellow('🙼')

/**
 * Rate limit time in milisecond
 *
 * @example
 * ```ts
 * await sleep(rate_limit_time_ms)
 * ```
 */
export const rate_limit_time_ms = 1100
