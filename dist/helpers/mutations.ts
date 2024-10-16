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

export { addAnimeToListMutation, addMangaToListMutation };
