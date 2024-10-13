const currentUserQuery = `
{
  Viewer {
    id
    name
    about
    bans
    siteUrl
    options {
      profileColor
      timezone
      activityMergeTime
    }
    donatorTier
    donatorBadge
    createdAt
    updatedAt
    unreadNotificationCount
    previousNames {
      name
      createdAt
      updatedAt
    }
    moderatorRoles
    favourites {
      anime {
        nodes {
          id
          title {
            romaji
            english
          }
        }
      }
      manga {
        nodes {
          id
          title {
            romaji
            english
          }
        }
      }
    }
    statistics {
      anime {
        count
        meanScore
        minutesWatched
      }
      manga {
        count
        chaptersRead
        volumesRead
      }
    }
    mediaListOptions {
      scoreFormat
      rowOrder
      animeList {
        sectionOrder
      }
      mangaList {
        sectionOrder
      }
    }
  }
}
`;
const trendingQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME) {
      id
      title {
        romaji
        english
      }
    }
  }
}
`;
const popularQuery = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME) {
      id
      title {
        romaji
        english
      }
    }
  }
}
`;
const userQuery = `
query ($username: String) {
  User(name: $username) {
    id
    name
    siteUrl
    donatorTier
    donatorBadge
    createdAt
    updatedAt
    previousNames {
      name
      createdAt
      updatedAt
    }
    isBlocked
    isFollower
    isFollowing
    options {
      profileColor
      timezone
      activityMergeTime
    }
    statistics {
      anime {
        count
        episodesWatched
        minutesWatched
      }
      manga {
        count
        chaptersRead
        volumesRead
      }
    }
  }
}
`;
const currentUserAnimeList = `
query ($id: Int) {
  MediaListCollection(userId: $id, type: ANIME) {
    lists {
      name
      entries {
        id
        media {
          id
          title {
            romaji
            english
          }
        }
      }
    }
  }
}
`;
const currentUserMangaList = `
  query ($id: Int) {
    MediaListCollection(userId: $id, type: MANGA) {
      lists {
        name
        entries {
          id
          media {
            title {
              romaji
              english
            }
          }
        }
      }
    }
  }
`;
const deleteMediaEntryMutation = `
 mutation($id: Int!) {
    DeleteMediaListEntry(id: $id) {
      deleted
    }
  }`;
const deleteMangaEntryMutation = `
  mutation ($id: Int) {
    DeleteMediaListEntry(id: $id) {
      deleted
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
};
