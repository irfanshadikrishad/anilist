const addAnimeToListMutation = `
mutation($mediaId: Int, $status: MediaListStatus) {
  SaveMediaListEntry(mediaId: $mediaId, status: $status) { id status }
}
`;
const addMangaToListMutation = `
  mutation($mediaId: Int, $status: MediaListStatus) {
    SaveMediaListEntry(mediaId: $mediaId, status: $status) {
      id
      status
      media { title { romaji english } }
    }
  }
`;
const deleteActivityMutation = `
mutation($id: Int!) {
  DeleteActivity(id: $id) { deleted }
}
`;

export {
  addAnimeToListMutation,
  addMangaToListMutation,
  deleteActivityMutation,
};
