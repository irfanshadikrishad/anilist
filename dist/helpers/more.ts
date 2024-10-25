import inquirer from "inquirer"
import fetch from "node-fetch"
import { Auth } from "./auth.js"
import { fetcher } from "./fetcher.js"
import { AniList, MyAnimeList } from "./lists.js"
import { addAnimeToListMutation, addMangaToListMutation } from "./mutations.js"
import {
  animeDetailsQuery,
  animeSearchQuery,
  mangaSearchQuery,
  userActivityQuery,
  userQuery,
} from "./queries.js"
import {
  aniListEndpoint,
  formatDateObject,
  getTitle,
  removeHtmlAndMarkdown,
} from "./workers.js"

async function getUserInfoByUsername(username: string) {
  try {
    const headers = {
      "content-type": "application/json",
    }
    if (await Auth.isLoggedIn()) {
      headers["Authorization"] = `Bearer ${await Auth.RetriveAccessToken()}`
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
      if (await Auth.isLoggedIn()) {
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
    if (await Auth.isLoggedIn()) {
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
        await AniList.importAnime()
        break
      case 2:
        await MyAnimeList.importAnime()
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
        choices: [
          { name: "Exported JSON file.", value: 1 },
          { name: "MyAnimeList (XML)", value: 2 },
        ],
        pageSize: 10,
      },
    ])
    switch (source) {
      case 1:
        await AniList.importManga()
        break
      case 2:
        await MyAnimeList.importManga()
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
  getAnimeDetailsByID,
  getAnimeSearchResults,
  getMangaSearchResults,
  getUserInfoByUsername,
  importAnimeList,
  importMangaList,
}
