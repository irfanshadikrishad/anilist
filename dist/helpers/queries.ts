const currentUserQuery = `
{
  Viewer {
    id name about bans siteUrl
    options { profileColor timezone activityMergeTime }
    donatorTier donatorBadge createdAt updatedAt
    unreadNotificationCount
    previousNames { name createdAt updatedAt }
    moderatorRoles
    favourites {
      anime { nodes { id title { romaji english } } }
      manga { nodes { id title { romaji english } } }
    }
    statistics {
      anime { count meanScore minutesWatched }
      manga { count chaptersRead volumesRead }
    }
    mediaListOptions {
      scoreFormat rowOrder
      animeList { sectionOrder }
      mangaList { sectionOrder }
    }
  }
}`;

const trendingQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME) {
      id title { romaji english }
    }
  }
}`;

const popularQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME) {
      id title { romaji english }
    }
  }
}`;

const userQuery = `
query ($username: String) {
  User(name: $username) {
    id name siteUrl donatorTier donatorBadge createdAt updatedAt
    previousNames { name createdAt updatedAt }
    isBlocked isFollower isFollowing
    options { profileColor timezone activityMergeTime }
    statistics {
      anime { count episodesWatched minutesWatched }
      manga { count chaptersRead volumesRead }
    }
  }
}`;

const currentUserAnimeList = `
query ($id: Int) {
  MediaListCollection(userId: $id, type: ANIME) {
    lists { name entries { id media { id title { romaji english } } } }
  }
}`;

const currentUserMangaList = `
query ($id: Int) {
  MediaListCollection(userId: $id, type: MANGA) {
    lists { name entries { id media { title { romaji english } } } }
  }
}`;

const deleteMediaEntryMutation = `
mutation($id: Int!) {
  DeleteMediaListEntry(id: $id) { deleted }
}`;

const deleteMangaEntryMutation = `
mutation ($id: Int) {
  DeleteMediaListEntry(id: $id) { deleted }
}`;

const upcomingAnimesQuery = `
query GetNextSeasonAnime($nextSeason: MediaSeason, $nextYear: Int, $perPage: Int) {
  Page(perPage: $perPage) {
    media(season: $nextSeason, seasonYear: $nextYear, type: ANIME, sort: POPULARITY_DESC) {
      id title { romaji english native userPreferred }
      season seasonYear startDate { year month day }
      episodes description genres
    }
  }
}`;

const animeDetailsQuery = `
query ($id: Int) {
  Media(id: $id) {
    id idMal title { romaji english native userPreferred }
    episodes nextAiringEpisode { id }
    duration startDate { year month day }
    endDate { year month day }
    countryOfOrigin description isAdult status season format genres siteUrl
    stats {
      scoreDistribution { score amount }
      statusDistribution { status amount }
    }
  }
}`;

const userActivityQuery = `
query ($id: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $id, type_in: [ANIME_LIST, MANGA_LIST], sort: ID_DESC) {
      ... on ListActivity {
        id status progress createdAt
        media { id title { romaji english } }
      }
    }
  }
}`;
const animeSearchQuery = `
query ($search: String, $perPage: Int) {
  Page(perPage: $perPage) {
    media(search: $search, type: ANIME) {
      id title { romaji english native userPreferred } episodes status description
    }
  }
}
`;
const mangaSearchQuery = `
query ($search: String, $perPage: Int) {
  Page(perPage: $perPage) {
    media(search: $search, type: MANGA) {
      id title { romaji english native userPreferred } chapters status description
    }
  }
}
`;

export {
  currentUserQuery,
  trendingQuery,
  popularQuery,
  userQuery,
  currentUserAnimeList,
  currentUserMangaList,
  deleteMediaEntryMutation,
  deleteMangaEntryMutation,
  upcomingAnimesQuery,
  animeDetailsQuery,
  userActivityQuery,
  animeSearchQuery,
  mangaSearchQuery,
};
