interface DeleteMangaResponse {
  data?: {
    DeleteMediaListEntry?: {
      deleted?: boolean
    }
  }
  errors?: { message: string }[]
}

enum AniListMediaStatus {
  CURRENT = "CURRENT",
  PLANNING = "PLANNING",
  COMPLETED = "COMPLETED",
  DROPPED = "DROPPED",
  PAUSED = "PAUSED",
  REPEATING = "REPEATING",
}

interface MALAnimeXML {
  series_animedb_id: number
  series_title: string
  series_type: string
  series_episodes: number
  my_id: number
  my_watched_episodes: number
  my_start_date: string
  my_finish_date: string
  my_rated: string
  my_score: number
  my_storage: string
  my_storage_value: number
  my_status: string
  my_comments: string
  my_times_watched: number
  my_rewatch_value: string
  my_priority: string
  my_tags: string
  my_rewatching: number
  my_rewatching_ep: number
  my_discuss: number
  my_sns: string
  update_on_import: number
}

interface MalIdToAnilistIdResponse {
  data?: {
    Media: {
      id: number
      title: {
        english?: string
        romaji?: string
      }
    }
  }
  errors?: {
    message: string
  }[]
}

interface saveAnimeWithProgressResponse {
  data?: {
    SaveMediaListEntry: {
      id: number
      progress: number
      hiddenFromStatusLists: boolean
    }
  }
  errors?: {
    message: string
  }[]
}

enum MALAnimeStatus {
  ON_HOLD = "On-Hold",
  DROPPED = "Dropped",
  COMPLETED = "Completed",
  WATCHING = "Watching",
  PLAN_TO_WATCH = "Plan to Watch",
}

enum MALMangaStatus {
  ON_HOLD = "On-Hold",
  DROPPED = "Dropped",
  COMPLETED = "Completed",
  READING = "Reading",
  PLAN_TO_READ = "Plan to Read",
}

interface AnimeList {
  data?: {
    MediaListCollection: {
      lists: MediaList[]
    }
  }
  errors?: {
    message: string
  }[]
}

interface MediaWithProgress {
  malId: number
  progress: number
  status: string
  episodes?: number
  chapters?: number
  title: { english?: string; romaji?: string }
}

interface MediaTitle {
  english?: string
  romaji?: string
  native?: string
  userPreferred?: string
}

interface Media {
  id: number
  idMal?: number
  title: MediaTitle
  chapters?: number
}

interface MediaEntry {
  media: Media
  private: boolean
  progress: number
  status: string
  hiddenFromStatusLists: boolean
}

interface List {
  name: string
  entries: MediaEntry[]
}
interface MediaList {
  id(id: number | string): string
  title: { english?: string; romaji?: string }
  name: string
  entries: MediaListEntry[]
}
interface Myself {
  data?: {
    Viewer: {
      id: number
      name: string
      siteUrl: string
      options: {
        profileColor: string
        timezone: string
        activityMergeTime: string
      }
      donatorTier: string
      donatorBadge: string
      unreadNotificationCount: number
      createdAt: number
      updatedAt: number
      statistics: {
        anime: {
          count: number
          meanScore: string
          minutesWatched: string
          episodesWatched: number
        }
        manga: {
          count: number
          meanScore: string
          chaptersRead: number
          volumesRead: number
        }
      }
    }
  }
  errors?: { message: string }[]
}
interface DateMonthYear {
  day?: string
  month?: string
  year?: string
}
interface AnimeDetails {
  data?: {
    Media: {
      id: number
      title: MediaTitle
      description: string
      duration: string
      startDate: DateMonthYear
      endDate: DateMonthYear
      countryOfOrigin: string
      isAdult: boolean
      status: string
      season: string
      format: string
      genres: [string]
      siteUrl: string
    }
  }
  errors?: { message: string }[]
}
interface MediaListEntry {
  id?: number
  media: {
    id?: number
    idMal?: number
    title?: MediaTitle
    episodes?: number
    siteUrl?: string
    chapters?: number
  }
  progress?: number
  status?: string
  hiddenFromStatusLists?: boolean
  private?: boolean
}

export {
  AniListMediaStatus,
  AnimeDetails,
  AnimeList,
  DateMonthYear,
  DeleteMangaResponse,
  List,
  MALAnimeStatus,
  MALAnimeXML,
  MALMangaStatus,
  MalIdToAnilistIdResponse,
  MediaEntry,
  MediaList,
  MediaListEntry,
  MediaTitle,
  MediaWithProgress,
  Myself,
  saveAnimeWithProgressResponse,
}
