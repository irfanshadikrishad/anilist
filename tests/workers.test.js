import {
  formatDateObject,
  getNextSeasonAndYear,
  timestampToTimeAgo,
} from '../bin/helpers/workers.js'

test('[Unit] formatDateObject valid', () => {
  const result = formatDateObject({ day: 22, month: 10, year: 2002 })
  expect(result).toContain('2002')
  expect(result).not.toBe('null')
})

test('[Unit] formatDateObject null input', () => {
  expect(formatDateObject(null)).toBe('null')
})

test('[Unit] formatDateObject with null fields', () => {
  const result = formatDateObject({ day: null, month: null, year: 2020 })
  expect(result).toContain('2020')
})

test('[Unit] formatDateObject empty object', () => {
  expect(formatDateObject({})).toBe('null')
})

test('[Unit] getNextSeasonAndYear returns valid season', () => {
  const { nextSeason, nextYear } = getNextSeasonAndYear()
  expect(['SPRING', 'SUMMER', 'FALL', 'WINTER']).toContain(nextSeason)
  expect(typeof nextYear).toBe('number')
  expect(nextYear).toBeGreaterThanOrEqual(new Date().getFullYear())
})

test('[Unit] timestampToTimeAgo recent', () => {
  const now = Math.floor(Date.now() / 1000)
  const result = timestampToTimeAgo(now - 30)
  expect(result).toContain('second')
})

test('[Unit] timestampToTimeAgo minutes ago', () => {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300
  const result = timestampToTimeAgo(fiveMinutesAgo)
  expect(result).toContain('minute')
})

test('[Unit] timestampToTimeAgo hours ago', () => {
  const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200
  const result = timestampToTimeAgo(twoHoursAgo)
  expect(result).toContain('hour')
})

test('[Unit] timestampToTimeAgo days ago', () => {
  const threeDaysAgo = Math.floor(Date.now() / 1000) - 259200
  const result = timestampToTimeAgo(threeDaysAgo)
  expect(result).toContain('day')
})
