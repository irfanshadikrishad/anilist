import Table from 'cli-table3'
import { User } from '../types.js'

export function renderUserProfile(
  user: User,
  followersCount: number,
  followingCount: number
): void {
  const table = new Table({
    chars: {
      'top': '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      'bottom': '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      'left': '',
      'left-mid': '',
      'mid': '',
      'mid-mid': '',
      'right': '',
      'right-mid': '',
      'middle': '',
    },
    style: {
      'padding-left': 0,
      'padding-right': 0,
      'head': [],
      'border': [],
    },
  })

  const row = (label: string, value: unknown) => [
    label.padEnd(30),
    String(value ?? 'null'),
  ]

  table.push(
    row('ID:', user.id),
    row('Name:', user.name),
    row('siteUrl:', user.siteUrl),
    row('profileColor:', user.options?.profileColor),
    row('timeZone:', user.options?.timezone),
    row('activityMergeTime:', user.options?.activityMergeTime),
    row('donatorTier:', user.donatorTier),
    row('donatorBadge:', user.donatorBadge),
    row('unreadNotificationCount:', user.unreadNotificationCount),
    row('Account Created:', new Date(user.createdAt * 1000).toUTCString()),
    row('Account Updated:', new Date(user.updatedAt * 1000).toUTCString()),
    ['', ''],
    row('Followers:', followersCount),
    row('Following:', followingCount),
    ['', ''],
    ['Statistics (Anime):', ''],
    row('  Count:', user.statistics?.anime?.count),
    row('  Mean Score:', user.statistics?.anime?.meanScore),
    row('  Minutes Watched:', user.statistics?.anime?.minutesWatched),
    row('  Episodes Watched:', user.statistics?.anime?.episodesWatched),
    ['', ''],
    ['Statistics (Manga):', ''],
    row('  Count:', user.statistics?.manga?.count),
    row('  Mean Score:', user.statistics?.manga?.meanScore),
    row('  Chapters Read:', user.statistics?.manga?.chaptersRead),
    row('  Volumes Read:', user.statistics?.manga?.volumesRead)
  )

  console.log(`\n${table.toString()}`)
}
