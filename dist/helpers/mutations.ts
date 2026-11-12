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

const likeActivityMutation = `
mutation($activityId: Int!) {
  ToggleLike(id: $activityId, type: ACTIVITY) { id }
}
`

const toggleFollowMutation = `mutation ($userId: Int!) { ToggleFollow(userId: $userId) { id name isFollower isFollowing } }`

const deleteMediaEntryMutation = `mutation($id: Int!) { DeleteMediaListEntry(id: $id) { deleted } }`

const deleteMangaEntryMutation = `mutation($id: Int) {
  DeleteMediaListEntry(id: $id) { deleted }
}`

export {
  addAnimeToListMutation,
  addMangaToListMutation,
  deleteActivityMutation,
  deleteMangaEntryMutation,
  deleteMediaEntryMutation,
  likeActivityMutation,
  saveAnimeWithProgressMutation,
  saveMangaWithProgressMutation,
  saveTextActivityMutation,
  toggleFollowMutation,
}
