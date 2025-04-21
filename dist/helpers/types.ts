type Error = {
  message: string
}[]

interface DeleteMangaResponse {
  data?: {
    DeleteMediaListEntry?: {
      deleted?: boolean
    }
  }
  errors?: Error
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
      title: MediaTitle
    }
  }
  errors?: Error
}

interface saveAnimeWithProgressResponse {
  data?: {
    SaveMediaListEntry: {
      id: number
      progress: number
      hiddenFromStatusLists: boolean
    }
  }
  errors?: Error
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
  errors?: Error
}

interface MediaWithProgress {
  malId?: number
  progress: number
  status: string
  episodes?: number
  chapters?: number
  format?: string
  title: MediaTitle
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

interface SaveTextActivityResponse {
  data?: {
    SaveTextActivity: {
      id: number
      userId: number
      text: string
      createdAt: number
    }
  }
  errors?: Error
}

interface MediaListCollectionResponse {
  data?: {
    MediaListCollection: {
      lists: MediaList[]
    }
  }
  errors?: Error
}

interface List {
  name: string
  entries: MediaEntry[]
}
interface MediaList {
  id(id: number | string): string
  title: MediaTitle
  name: string
  entries: MediaListEntry[]
}
interface Myself {
  data?: {
    Viewer: User
  }
  errors?: Error
}
interface DateMonthYear {
  day?: number | null
  month?: number | null
  year?: number | null
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
  errors?: Error
}
interface SaveMediaListEntryResponse {
  data?: { SaveMediaListEntry: { id: number; status: string } }
  errors?: Error
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
    format?: string
  }
  progress?: number
  status?: string
  hiddenFromStatusLists?: boolean
  private?: boolean
}

type UserActivitiesResponse = {
  data?: {
    Page: {
      activities: Activity[]
    }
  }
  errors?: Error
}

type UserResponse = {
  data?: {
    User: User
  }
  errors?: Error
}

type Avatar = {
  large?: string
  medium?: string
}

type User = {
  id: number
  name?: string
  avatar?: Avatar
  bannerImage?: string
  isFollower?: boolean
  isFollowing?: boolean
  siteUrl?: string
  donatorTier?: string
  donatorBadge?: string
  createdAt?: number
  updatedAt?: number
  isBlocked?: boolean
  unreadNotificationCount?: number
  options?: {
    profileColor?: string
    timezone?: string
    activityMergeTime?: number
  }
  statistics?: {
    anime?: {
      count?: number
      episodesWatched?: number
      minutesWatched?: number
      meanScore?: number
    }
    manga?: {
      count?: number
      chaptersRead?: number
      volumesRead?: number
      meanScore?: number
    }
  }
}

type UserFollower = {
  data?: {
    Page: {
      pageInfo: {
        total: number
        perPage: number
        currentPage: number
        lastPage: number
        hasNextPage: boolean
      }
      followers: User[]
    }
  }
  errors?: Error
}

type UserFollowing = {
  data?: {
    Page: {
      pageInfo: {
        total: number
        perPage: number
        currentPage: number
        lastPage: number
        hasNextPage: boolean
      }
      following: User[]
    }
  }
  errors?: Error
}

type AnimeSearchResponse = {
  data?: {
    Page: {
      media: {
        id: number
        title: MediaTitle
        startDate: DateMonthYear
        episodes: number
        status: string
        description: string
      }[]
    }
  }
  errors?: Error
}

type ToggleFollowResponse = {
  data?: {
    ToggleFollow: {
      id: number
      name: string
      isFollower: boolean
      isFollowing: boolean
    }
  }
  errors?: Error
}

type DeleteMediaListResponse = {
  data?: { DeleteMediaListEntry: { deleted: boolean } }
  errors?: Error
}

type Activity = {
  id: number
  type: string
  status: string
  progress: number | null
  media: { id?: number; title: MediaTitle }
  createdAt: number
}

type CoverImage = {
  color: string
  medium: string
  large: string
  extraLarge: string
}

type MangaDetails = {
  data?: {
    Media: {
      id: number
      title: MediaTitle
      coverImage: CoverImage
      bannerImage: string
      description: string
      chapters: number | null
      volumes: number | null
      status: string
      genres: [string]
      startDate: DateMonthYear
      endDate: DateMonthYear
    }
  }
  errors?: Error
}

type MoveListsResponse = {
  data?: {
    SaveMediaListEntry: {
      id: 474487691
      status: "COMPLETED"
      hiddenFromStatusLists: true
      customLists: Record<string, boolean>
      media: { title: MediaTitle }
    }
  }
  errors?: Error
}

export {
  Activity,
  AniListMediaStatus,
  AnimeDetails,
  AnimeList,
  AnimeSearchResponse,
  DateMonthYear,
  DeleteMangaResponse,
  DeleteMediaListResponse,
  List,
  MALAnimeStatus,
  MALAnimeXML,
  MALMangaStatus,
  MalIdToAnilistIdResponse,
  MangaDetails,
  MediaEntry,
  MediaList,
  MediaListCollectionResponse,
  MediaListEntry,
  MediaTitle,
  MediaWithProgress,
  MoveListsResponse,
  Myself,
  SaveMediaListEntryResponse,
  SaveTextActivityResponse,
  ToggleFollowResponse,
  User,
  UserActivitiesResponse,
  UserFollower,
  UserFollowing,
  UserResponse,
  saveAnimeWithProgressResponse,
}
