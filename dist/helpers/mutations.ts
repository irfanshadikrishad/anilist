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
      media { id title { romaji english } }
    }
  }
`;
const deleteActivityMutation = `
mutation($id: Int!) {
  DeleteActivity(id: $id) { deleted }
}
`;
const saveTextActivityMutation = `
mutation SaveTextActivity($status: String!) {
  SaveTextActivity(text: $status) { id text userId createdAt }
}
`;

export {
  addAnimeToListMutation,
  addMangaToListMutation,
  deleteActivityMutation,
  saveTextActivityMutation,
};
