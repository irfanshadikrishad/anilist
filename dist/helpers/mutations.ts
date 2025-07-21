const addAnimeToListMutation = `
mutation($mediaId: Int, $status: MediaListStatus) {
  SaveMediaListEntry(mediaId: $mediaId, status: $status) { id status }
}
`
const addMangaToListMutation = `
  mutation($mediaId: Int, $status: MediaListStatus) {
    SaveMediaListEntry(mediaId: $mediaId, status: $status) {
      id status media { id title { romaji english } }
    }
  }
`
const deleteActivityMutation = `
mutation($id: Int!) { DeleteActivity(id: $id) { deleted } }
`

const saveTextActivityMutation = `
mutation SaveTextActivity($status: String!) { SaveTextActivity(text: $status) { id text userId createdAt } }
`
const saveAnimeWithProgressMutation = `
mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus, $hiddenFromStatusLists: Boolean) {
  SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status, hiddenFromStatusLists: $hiddenFromStatusLists) {
    id progress hiddenFromStatusLists
  }
}
`

const saveMangaWithProgressMutation = `
mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus, $hiddenFromStatusLists: Boolean, $private: Boolean) {
  SaveMediaListEntry( mediaId: $mediaId, progress: $progress, status: $status, hiddenFromStatusLists: $hiddenFromStatusLists, private: $private
  ) { id progress hiddenFromStatusLists private }
}
`

const toggleFollowMutation = `mutation ($userId: Int!) { ToggleFollow(userId: $userId) { id name isFollower isFollowing } }`

const deleteMediaEntryMutation = `mutation($id: Int!) { DeleteMediaListEntry(id: $id) { deleted } }`

const deleteMangaEntryMutation = `mutation($id: Int) {
  DeleteMediaListEntry(id: $id) { deleted }
}`

const moveListMutation = `mutation ($mediaId: Int, $status: MediaListStatus, $customList: String) {
  SaveMediaListEntry(
    mediaId: $mediaId
    status: $status
    customLists: [$customList]
    hiddenFromStatusLists: true
  ) { id status hiddenFromStatusLists customLists media { title { romaji english native userPreferred } } }
}`

export {
  addAnimeToListMutation,
  addMangaToListMutation,
  deleteActivityMutation,
  deleteMangaEntryMutation,
  deleteMediaEntryMutation,
  moveListMutation,
  saveAnimeWithProgressMutation,
  saveMangaWithProgressMutation,
  saveTextActivityMutation,
  toggleFollowMutation,
}
