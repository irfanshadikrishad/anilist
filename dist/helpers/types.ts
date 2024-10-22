interface DeleteMangaResponse {
  data?: {
    DeleteMediaListEntry?: {
      deleted?: boolean
    }
  }
  errors?: { message: string }[]
}

export { DeleteMangaResponse }
