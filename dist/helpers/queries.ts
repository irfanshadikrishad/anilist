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

export { currentUserQuery, trendingQuery, popularQuery };
