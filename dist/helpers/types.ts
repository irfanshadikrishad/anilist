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

export { AniListMediaStatus, DeleteMangaResponse, MALAnimeXML }
