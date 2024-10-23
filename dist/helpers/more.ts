import inquirer from "inquirer"
import fetch from "node-fetch"
import { currentUsersId, isLoggedIn, retriveAccessToken } from "./auth.js"
import { fetcher } from "./fetcher.js"
import {
  addAnimeToListMutation,
  addMangaToListMutation,
  deleteActivityMutation,
  saveTextActivityMutation,
} from "./mutations.js"
import {
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
  mangaSearchQuery,
  userActivityQuery,
  userQuery,
} from "./queries.js"
import {
  aniListEndpoint,
  formatDateObject,
  getTitle,
  importAnimeListFromExportedJSON,
  importMangaListFromExportedJSON,
  MALimport,
  removeHtmlAndMarkdown,
  saveJSONasCSV,
  saveJSONasJSON,
} from "./workers.js"

async function getUserInfoByUsername(username: string) {
  try {
    const headers = {
      "content-type": "application/json",
    }
    if (await isLoggedIn()) {
      headers["Authorization"] = `Bearer ${await retriveAccessToken()}`
    }
    const request: any = await fetch(aniListEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query: userQuery, variables: { username } }),
    })
    const response: {
      data?: { User: { id: number } }
      errors?: { message: string }
    } = await request.json()
    if (request.status === 200) {
      const user: any = response?.data?.User
      const responseUserActivity: any = await fetcher(userActivityQuery, {
        id: user?.id,
        page: 1,
        perPage: 10,
      })
      const activities = responseUserActivity?.data?.Page?.activities || []

      console.log(`\nID:\t\t${user?.id}`)
      console.log(`Name:\t\t${user?.name}`)
      console.log(`siteUrl:\t${user?.siteUrl}`)
      console.log(`Donator Tier:\t${user?.donatorTier}`)
      console.log(`Donator Badge:\t${user?.donatorBadge}`)
      if (user?.createdAt) {
        console.log(
          `Account Created: ${new Date(user.createdAt * 1000).toUTCString()}`
        )
      }
      console.log(
        `Account Updated:${new Date(user?.updatedAt * 1000).toUTCString()}`
      )
      console.log(`I blocked?\t${user?.isBlocked}`)
      console.log(`My follower:\t${user?.isFollower}`)
      console.log(`I'm following:\t${user?.isFollowing}`)
      console.log(`Color:\t${user?.options?.profileColor}`)
      console.log(`Timezone:\t${user?.options?.timezone}`)
      console.log(
        `\nStatistics (Anime)\nCount: ${user?.statistics?.anime?.count} episodesWatched: ${user?.statistics?.anime?.episodesWatched} minutesWatched: ${user?.statistics?.anime?.minutesWatched}`
      )
      console.log(
        `Statistics (Manga)\nCount: ${user?.statistics?.manga?.count} Chapter Read: ${user?.statistics?.manga?.chaptersRead} Volumes Read: ${user?.statistics?.manga?.volumesRead}`
      )
      console.log(`\nRecent Activities:`)
      if (activities.length > 0) {
        activities.map(({ status, progress, media }) => {
          console.log(
            `${status} ${progress ? `${progress} of ` : ""}${getTitle(
              media?.title
            )}`
          )
        })
      }
    } else {
      console.error(`\n${request.status} ${response?.errors[0]?.message}`)
    }
  } catch (error) {
    console.error(`\nSomething went wrong. ${(error as Error).message}`)
  }
}
async function getAnimeDetailsByID(anilistID: number) {
  const query = animeDetailsQuery
  const variables = { id: anilistID }
  const details: any = await fetcher(query, variables)

  if (details?.data?.Media) {
    const {
      id,
      title,
      description,
      duration,
      startDate,
      endDate,
      countryOfOrigin,
      isAdult,
      status,
      season,
      format,
      genres,
      siteUrl,
    } = details.data.Media

    console.log(`\nID: ${id}`)
    console.log(`Title: ${title?.userPreffered || getTitle(title)}`)
    console.log(`Description: ${removeHtmlAndMarkdown(description)}`)
    console.log(`Episode Duration: ${duration}min`)
    console.log(`Origin: ${countryOfOrigin}`)
    console.log(`Status: ${String(status)}`)
    console.log(`Format: ${format}`)
    console.log(`Genres: ${genres.join(", ")}`)
    console.log(`Season: ${season}`)
    console.log(`Url: `, siteUrl)
    console.log(`isAdult: ${isAdult}`)
    console.log(`Released: ${formatDateObject(startDate)}`)
    console.log(`Finished: ${formatDateObject(endDate)}`)
  }
}
async function getAnimeSearchResults(search: string, count: number) {
  const query = animeSearchQuery
  const variables = { search, page: 1, perPage: count }

  const searchResults: any = await fetcher(query, variables)

  if (searchResults) {
    const results = searchResults?.data?.Page?.media
    if (results.length > 0) {
      const { selectedList } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedList",
          message: "Select anime to add to your list:",
          choices: results.map((res: any, idx: number) => ({
            name: `[${idx + 1}] ${getTitle(res?.title)}`,
            value: res?.id,
          })),
          pageSize: 10,
        },
      ])
      // Where to save
      const { selectedListType } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedListType",
          message: "Select the list where you want to save this anime:",
          choices: [
            { name: "Planning", value: "PLANNING" },
            { name: "Watching", value: "CURRENT" },
            { name: "Completed", value: "COMPLETED" },
            { name: "Paused", value: "PAUSED" },
            { name: "Dropped", value: "DROPPED" },
          ],
        },
      ])
      // Lets save to the list now
      if (await isLoggedIn()) {
        const query = addAnimeToListMutation
        const variables = { mediaId: selectedList, status: selectedListType }

        const response: any = await fetcher(query, variables)

        if (response) {
          const saved = response?.data?.SaveMediaListEntry
          console.log(`\nEntry ${saved?.id}. Saved as ${saved?.status}.`)
        }
      } else {
        console.error(`\nPlease log in first to use this feature.`)
      }
    } else {
      console.log(`\nNo search results!`)
    }
  } else {
    console.error(`\nSomething went wrong.`)
  }
}

async function getMangaSearchResults(search: string, count: number) {
  const query = mangaSearchQuery
  const variables = { search, page: 1, perPage: count }

  const mangaSearchResult: any = await fetcher(query, variables)

  if (mangaSearchResult) {
    const results = mangaSearchResult?.data?.Page?.media
    // List of manga search results
    const { selectedMangaId } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedMangaId",
        message: "Select manga to add to your list:",
        choices: results.map((res: any, idx: number) => ({
          name: `[${idx + 1}] ${getTitle(res?.title)}`,
          value: res?.id,
        })),
        pageSize: 10,
      },
    ])
    // Options to save to the list
    const { selectedListType } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedListType",
        message: "Select the list where you want to save this manga:",
        choices: [
          { name: "Planning", value: "PLANNING" },
          { name: "Reading", value: "CURRENT" },
          { name: "Completed", value: "COMPLETED" },
          { name: "Paused", value: "PAUSED" },
          { name: "Dropped", value: "DROPPED" },
        ],
      },
    ])

    // If logged in save to the list
    if (await isLoggedIn()) {
      const mutation = addMangaToListMutation
      const variables = { mediaId: selectedMangaId, status: selectedListType }
      const response: any = await fetcher(mutation, variables)

      if (response) {
        const saved = response?.data?.SaveMediaListEntry
        console.log(`\nEntry ${saved?.id}. Saved as ${saved?.status}.`)
      }
    } else {
      console.error(`\nPlease log in first to use this feature.`)
    }
  } else {
    console.error(`\nSomething went wrong.`)
  }
}
async function deleteUserActivities() {
  if (await isLoggedIn()) {
    const { activityType } = await inquirer.prompt([
      {
        type: "list",
        name: "activityType",
        message: "What type of activity you want to delete?",
        choices: [
          { name: "All Activity", value: 0 },
          { name: "Text Activity", value: 1 },
          { name: "Media List Activity", value: 2 },
          { name: "Anime List Activity", value: 3 },
          { name: "Manga List Activity", value: 4 },
          { name: "Message Activity", value: 5 },
        ],
      },
    ])
    const userId = await currentUsersId()
    const variables = { page: 1, perPage: 100, userId }
    const queryMap = {
      0: activityAllQuery,
      1: activityTextQuery,
      2: activityMediaList,
      3: activityAnimeListQuery,
      4: activityMangaListQuery,
      5: activityMessageQuery,
    }
    const query = queryMap[activityType]

    let hasMoreActivities = true

    while (hasMoreActivities) {
      const response: any = await fetcher(query, {
        page: 1,
        perPage: 50,
        userId: await currentUsersId(),
      })

      if (response?.data?.Page?.activities) {
        let count = 0
        const activities = response?.data?.Page?.activities

        if (!activities || activities.length === 0) {
          console.log(`\nNo more activities available.`)
          hasMoreActivities = false
        } else {
          for (const act of activities) {
            // Ensure ID is present to avoid unintended errors
            if (act?.id) {
              const deleteResponse: any = await fetcher(
                deleteActivityMutation,
                {
                  id: act?.id,
                }
              )
              const isDeleted = deleteResponse?.data?.DeleteActivity?.deleted
              count++

              console.log(
                `[${count}/${activities.length}] ${act?.id} ${
                  isDeleted ? "✅" : "❌"
                }`
              )

              // Avoiding rate-limit
              await new Promise((resolve) => setTimeout(resolve, 2000))
            }
          }
        }
      } else {
        // In case of an unexpected null response, exit the loop
        console.log(`\nProbably deleted all the activities of this type.`)
        hasMoreActivities = false
      }
    }
  } else {
    console.error(`\nPlease log in to delete your activities.`)
  }
}

async function writeTextActivity(status: string) {
  try {
    if (!(await isLoggedIn())) {
      console.error(`\nPlease login to use this feature.`)
      return
    }

    const query = saveTextActivityMutation
    const variables = {
      status:
        status +
        `<br><br><br><br>*Written using [@irfanshadikrishad/anilist](https://www.npmjs.com/package/@irfanshadikrishad/anilist).*`,
    }

    const data: any = await fetcher(query, variables)

    if (!data) {
      console.error(`\nSomething went wrong. ${data}.`)
      return
    }

    const savedActivity = data.data?.SaveTextActivity

    if (savedActivity?.id) {
      console.log(`\n[${savedActivity.id}] status saved successfully!`)
    }
  } catch (error) {
    console.error(`\n${(error as Error).message}`)
  }
}

async function exportAnimeList() {
  if (await isLoggedIn()) {
    const { exportType } = await inquirer.prompt([
      {
        type: "list",
        name: "exportType",
        message: "Choose export type:",
        choices: [
          { name: "CSV", value: 1 },
          { name: "JSON", value: 2 },
        ],
        pageSize: 10,
      },
    ])
    const animeList: any = await fetcher(currentUserAnimeList, {
      id: await currentUsersId(),
    })
    if (animeList) {
      const lists = animeList?.data?.MediaListCollection?.lists ?? []
      const mediaWithProgress = lists.flatMap((list: any) =>
        list.entries.map((entry: any) => ({
          id: entry?.media?.id,
          title:
            exportType === 1
              ? getTitle(entry?.media?.title)
              : entry?.media?.title,
          episodes: entry?.media?.episodes,
          siteUrl: entry?.media?.siteUrl,
          progress: entry.progress,
          status: entry?.status,
          hiddenFromStatusLists: entry.hiddenFromStatusLists,
        }))
      )

      switch (exportType) {
        case 1:
          await saveJSONasCSV(mediaWithProgress, "anime")
          break
        case 2:
          await saveJSONasJSON(mediaWithProgress, "anime")
          break
      }
    } else {
      console.error(`\nNo anime(s) found in your lists.`)
    }
  } else {
    console.error(`\nMust login to use this feature.`)
  }
}

async function exportMangaList() {
  if (await isLoggedIn()) {
    const mangaLists: any = await fetcher(currentUserMangaList, {
      id: await currentUsersId(),
    })
    if (mangaLists) {
      const lists = mangaLists?.data?.MediaListCollection?.lists || []
      if (lists.length > 0) {
        const { exportType } = await inquirer.prompt([
          {
            type: "list",
            name: "exportType",
            message: "Choose export type:",
            choices: [
              { name: "CSV", value: 1 },
              { name: "JSON", value: 2 },
            ],
            pageSize: 10,
          },
        ])
        const mediaWithProgress = lists.flatMap((list: any) =>
          list.entries.map((entry: any) => ({
            id: entry?.media?.id,
            title:
              exportType === 1
                ? getTitle(entry?.media?.title)
                : entry?.media?.title,
            private: entry.private,
            chapters: entry.media.chapters,
            progress: entry.progress,
            status: entry?.status,
            hiddenFromStatusLists: entry.hiddenFromStatusLists,
          }))
        )
        switch (exportType) {
          case 1:
            await saveJSONasCSV(mediaWithProgress, "manga")
            break
          case 2:
            await saveJSONasJSON(mediaWithProgress, "manga")
            break
        }
      } else {
        console.log(`\nList seems to be empty.`)
      }
    } else {
      console.error(`\nCould not get manga list.`)
    }
  } else {
    console.error(`\nPlease login to use this feature.`)
  }
}
async function importAnimeList() {
  try {
    const { source } = await inquirer.prompt([
      {
        type: "list",
        name: "source",
        message: "Select a source:",
        choices: [
          { name: "Exported JSON file.", value: 1 },
          { name: "MyAnimeList (XML)", value: 2 },
        ],
        pageSize: 10,
      },
    ])
    switch (source) {
      case 1:
        await importAnimeListFromExportedJSON()
        break
      case 2:
        await MALimport.Anime()
        break
      default:
        console.log(`\nInvalid Choice.`)
        break
    }
  } catch (error) {
    console.error(`\n${(error as Error).message}`)
  }
}
async function importMangaList() {
  try {
    const { source } = await inquirer.prompt([
      {
        type: "list",
        name: "source",
        message: "Select a source:",
        choices: [{ name: "Exported JSON file.", value: 1 }],
        pageSize: 10,
      },
    ])
    switch (source) {
      case 1:
        await importMangaListFromExportedJSON()
        break
      default:
        console.log(`\nInvalid Choice.`)
        break
    }
  } catch (error) {
    console.error(`\n${(error as Error).message}`)
  }
}

export {
  deleteUserActivities,
  exportAnimeList,
  exportMangaList,
  getAnimeDetailsByID,
  getAnimeSearchResults,
  getMangaSearchResults,
  getUserInfoByUsername,
  importAnimeList,
  importMangaList,
  writeTextActivity,
}
