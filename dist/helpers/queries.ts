const currentUserQuery = `{
  Viewer {
    id name about bans siteUrl options { profileColor timezone activityMergeTime }
    donatorTier donatorBadge createdAt updatedAt unreadNotificationCount previousNames { name createdAt updatedAt }
    moderatorRoles favourites { anime { nodes { id title { romaji english } } } manga { nodes { id title { romaji english } } } }
    statistics { anime { count meanScore minutesWatched episodesWatched } manga { count chaptersRead volumesRead meanScore } }
    mediaListOptions { scoreFormat rowOrder animeList { sectionOrder } mangaList { sectionOrder } }
  }
}`

const trendingQuery = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME) { id title { romaji english } }
  }
}`

const popularQuery = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME) { id title { romaji english } }
  }
}`

const userQuery = `query ($username: String) {
  User(name: $username) {
    id name siteUrl donatorTier donatorBadge createdAt updatedAt previousNames { name createdAt updatedAt }
    isBlocked isFollower isFollowing options { profileColor timezone activityMergeTime }
    statistics { anime { count episodesWatched minutesWatched } manga { count chaptersRead volumesRead } }
  }
}`

const currentUserAnimeList = `query ($id: Int) {
  MediaListCollection(userId: $id, type: ANIME) {
    lists { name entries { id progress hiddenFromStatusLists status media { id idMal title { romaji english native userPreferred } status episodes siteUrl format } } }
  }
}
`

const currentUserMangaList = `query ($id: Int) {
  MediaListCollection(userId: $id, type: MANGA) {
    lists { name entries { id progress hiddenFromStatusLists private status media { id idMal title { romaji english native userPreferred } status chapters } } }
  }
}
`

const deleteMediaEntryMutation = `mutation($id: Int!) {
  DeleteMediaListEntry(id: $id) { deleted }
}`

const deleteMangaEntryMutation = `mutation($id: Int) {
  DeleteMediaListEntry(id: $id) { deleted }
}`

const upcomingAnimesQuery = `query GetNextSeasonAnime($nextSeason: MediaSeason, $nextYear: Int, $perPage: Int) {
  Page(perPage: $perPage) {
    media(season: $nextSeason, seasonYear: $nextYear, type: ANIME, sort: POPULARITY_DESC) {
      id title { romaji english native userPreferred } season seasonYear startDate { year month day }
      episodes description genres
    }
  }
}`

const animeDetailsQuery = `query ($id: Int) {
  Media(id: $id) {
    id idMal title { romaji english native userPreferred } episodes nextAiringEpisode { id }
    duration startDate { year month day } endDate { year month day } countryOfOrigin description isAdult status season format genres siteUrl
    stats { scoreDistribution { score amount } statusDistribution { status amount } }
  }
}`

const userActivityQuery = `query ($id: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $id, type_in: [ANIME_LIST, MANGA_LIST], sort: ID_DESC) {
      ... on ListActivity { id status progress createdAt media { id title { romaji english } } }
    }
  }
}`

const animeSearchQuery = `query ($search: String, $perPage: Int) {
  Page(perPage: $perPage) {
    media(search: $search, type: ANIME) { id title { romaji english native userPreferred } startDate { day month year } episodes status description }
  }
}`

const mangaSearchQuery = `query ($search: String, $perPage: Int) {
  Page(perPage: $perPage) {
    media(search: $search, type: MANGA) { id title { romaji english native userPreferred } chapters status description }
  }
}`

const activityTextQuery = `query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $userId, type: TEXT, sort: ID_DESC) {
      ... on TextActivity { id type text createdAt user { id name } }
    }
  }
}`

const activityAnimeListQuery = `query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $userId, type: ANIME_LIST, sort: ID_DESC) {
      ... on ListActivity { id type status progress createdAt media { id title { romaji english native } } }
    }
  }
}`

const activityMangaListQuery = `query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $userId, type: MANGA_LIST, sort: ID_DESC) {
      ... on ListActivity { id type status progress createdAt media { id title { romaji english native } } }
    }
  }
}`

const activityMessageQuery = `query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $userId, type: MESSAGE, sort: ID_DESC) {
      ... on MessageActivity { id type message recipient { id name } createdAt }
    }
  }
}`

const activityAllQuery = `query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $userId, sort: ID_DESC) {
      ... on TextActivity { id type text createdAt user { id name } }
      ... on ListActivity { id type status progress createdAt media { id title { romaji english native } } }
      ... on MessageActivity { id type message recipient { id name } createdAt }
    }
  }
}`

const activityMediaList = `query ($userId: Int, $page: Int, $perPage: Int, $type: ActivityType) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage perPage }
    activities(userId: $userId, type: $type, sort: ID_DESC) {
      ... on ListActivity { id type status progress media { id title { romaji english native } format } createdAt }
    }
  }
}`

const malIdToAnilistAnimeId = `query ($malId: Int) {
  Media(idMal: $malId, type: ANIME) {
    id title { romaji english } } 
}
`

const malIdToAnilistMangaId = `query ($malId: Int) {
  Media(idMal: $malId, type: MANGA) {
    id title { romaji english } } 
}
`

const userFollowingQuery = `query ($userId: Int!, $page: Int) {
  Page (page: $page) {
    pageInfo { total perPage currentPage lastPage hasNextPage }
    following(userId: $userId, sort: [USERNAME]) { id name avatar { large medium } bannerImage isFollowing isFollower }
  }
}
`

const userFollowersQuery = `query ($userId: Int!, $page: Int) {
  Page (page: $page) {
    pageInfo { total perPage currentPage lastPage hasNextPage }
    followers(userId: $userId, sort: [USERNAME]) { id name avatar { large medium } bannerImage isFollowing isFollower }
  }
}
`

const toggleFollowMutation = `mutation ($userId: Int!) {
  ToggleFollow(userId: $userId) { id name isFollower isFollowing }
}
`

const mangaDetailsQuery = `query ($id: Int) {
  Media(id: $id, type: MANGA) {
    id title { romaji english native userPreferred } coverImage { color medium large extraLarge } 
    bannerImage description chapters volumes status genres
    startDate { year month day } endDate { year month day }
  }
}
`

export {
  activityAllQuery,
  activityAnimeListQuery,
  activityMangaListQuery,
  activityMediaList,
  activityMessageQuery,
  activityTextQuery,
  animeDetailsQuery,
  animeSearchQuery,
  currentUserAnimeList,
  currentUserMangaList,
  currentUserQuery,
  deleteMangaEntryMutation,
  deleteMediaEntryMutation,
  malIdToAnilistAnimeId,
  malIdToAnilistMangaId,
  mangaDetailsQuery,
  mangaSearchQuery,
  popularQuery,
  toggleFollowMutation,
  trendingQuery,
  upcomingAnimesQuery,
  userActivityQuery,
  userFollowersQuery,
  userFollowingQuery,
  userQuery,
}
