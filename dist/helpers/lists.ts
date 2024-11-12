import { XMLParser } from "fast-xml-parser"
import { readFile, writeFile } from "fs/promises"
import inquirer from "inquirer"
import fetch from "node-fetch"
import { join } from "path"
import { Auth } from "./auth.js"
import { fetcher } from "./fetcher.js"
import {
  addAnimeToListMutation,
  addMangaToListMutation,
  saveAnimeWithProgressMutation,
  saveMangaWithProgressMutation,
} from "./mutations.js"
import {
  animeDetailsQuery,
  animeSearchQuery,
  currentUserAnimeList,
  currentUserMangaList,
  malIdToAnilistAnimeId,
  malIdToAnilistMangaId,
  mangaSearchQuery,
  popularQuery,
  trendingQuery,
  upcomingAnimesQuery,
  userActivityQuery,
  userQuery,
} from "./queries.js"
import {
  AniListMediaStatus,
  AnimeList,
  MalIdToAnilistIdResponse,
  saveAnimeWithProgressResponse,
} from "./types.js"
import {
  aniListEndpoint,
  createAnimeListXML,
  createMangaListXML,
  formatDateObject,
  getDownloadFolderPath,
  getFormattedDate,
  getNextSeasonAndYear,
  getTitle,
  removeHtmlAndMarkdown,
  saveJSONasCSV,
  saveJSONasJSON,
  selectFile,
} from "./workers.js"

class AniList {
  static async importAnime() {
    try {
      const filename = await selectFile(".json")
      const filePath = join(getDownloadFolderPath(), filename)
      const fileContent = await readFile(filePath, "utf8")
      const importedData = JSON.parse(fileContent)

      let count = 0
      const batchSize = 1 // Number of requests in each batch
      const delay = 1100 // delay to avoid rate-limiting

      for (let i = 0; i < importedData.length; i += batchSize) {
        const batch = importedData.slice(i, i + batchSize)

        await Promise.all(
          batch.map(
            async (anime: { id: number; progress: number; status: string }) => {
              const query = saveAnimeWithProgressMutation
              const variables = {
                mediaId: anime?.id,
                progress: anime?.progress,
                status: anime?.status,
                hiddenFromStatusLists: false,
              }

              try {
                const save: {
                  data?: { SaveMediaListEntry: { id: number } }
                  errors?: { message: string }
                } = await fetcher(query, variables)
                if (save) {
                  const id = save?.data?.SaveMediaListEntry?.id
                  count++
                  console.log(`[${count}] ${anime?.id}-${id} ✅`)
                } else {
                  console.error(`\nError saving ${anime?.id}`)
                }
              } catch (error) {
                console.error(
                  `\nError saving ${anime?.id}: ${(error as Error).message}`
                )
              }
            }
          )
        )

        // Avoid rate-limiting: Wait before sending the next batch
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      console.log(`\nTotal ${count} anime(s) imported successfully.`)
    } catch (error) {
      console.error(`\n${(error as Error).message}`)
    }
  }
  static async importManga() {
    try {
      const filename = await selectFile(".json")
      const filePath = join(getDownloadFolderPath(), filename)
      const fileContent = await readFile(filePath, "utf8")
      const importedData = JSON.parse(fileContent)

      let count = 0
      const batchSize = 1 // Adjust batch size as per rate-limit constraints
      const delay = 1100 // 2 seconds delay to avoid rate-limit

      // Process in batches
      for (let i = 0; i < importedData.length; i += batchSize) {
        const batch = importedData.slice(i, i + batchSize)

        await Promise.all(
          batch.map(
            async (manga: {
              id: number
              progress: number
              status: string
              private: boolean
            }) => {
              const query = saveMangaWithProgressMutation
              const variables = {
                mediaId: manga?.id,
                progress: manga?.progress,
                status: manga?.status,
                hiddenFromStatusLists: false,
                private: manga?.private,
              }

              try {
                const save: {
                  data?: { SaveMediaListEntry: { id: number } }
                  errors?: { message: string }
                } = await fetcher(query, variables)
                if (save) {
                  const id = save?.data?.SaveMediaListEntry?.id
                  count++
                  console.log(`[${count}] ${manga?.id}-${id} ✅`)
                }
              } catch (err) {
                console.error(
                  `\nError saving ${manga?.id}: ${(err as Error).message}`
                )
              }
            }
          )
        )

        // Avoid rate-limit by adding delay after processing each batch
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      console.log(`\nTotal ${count} manga(s) imported successfully.`)
    } catch (error) {
      console.error(`\nError: ${(error as Error).message}`)
    }
  }
  static async exportAnime() {
    if (await Auth.isLoggedIn()) {
      const { exportType } = await inquirer.prompt([
        {
          type: "list",
          name: "exportType",
          message: "Choose export type:",
          choices: [
            { name: "CSV", value: 1 },
            { name: "JSON", value: 2 },
            { name: "XML (MyAnimeList)", value: 3 },
          ],
          pageSize: 10,
        },
      ])
      const animeList: any = await fetcher(currentUserAnimeList, {
        id: await Auth.MyUserId(),
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
          case 3:
            await MyAnimeList.exportAnime()
            break
          default:
            console.log(`\nInvalid export type. ${exportType}`)
            break
        }
      } else {
        console.error(`\nNo anime(s) found in your lists.`)
      }
    } else {
      console.error(`\nMust login to use this feature.`)
    }
  }
  static async exportManga() {
    if (await Auth.isLoggedIn()) {
      const mangaLists: any = await fetcher(currentUserMangaList, {
        id: await Auth.MyUserId(),
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
                { name: "XML (MyAnimeList)", value: 3 },
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
            case 3:
              await MyAnimeList.exportManga()
              break
            default:
              console.log(`\nInvalid export type. ${exportType}`)
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
  static async MyAnime() {
    try {
      if (!(await Auth.isLoggedIn())) {
        return console.error(`\nPlease log in first to access your lists.`)
      }

      const userId = await Auth.MyUserId()
      if (!userId) {
        return console.log(`\nFailed getting current user Id.`)
      }

      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": `Bearer ${await Auth.RetriveAccessToken()}`,
        },
        body: JSON.stringify({
          query: currentUserAnimeList,
          variables: { id: userId },
        }),
      })

      const { data, errors }: AnimeList = await request.json()

      if (request.status !== 200 || errors) {
        return console.log(`\nSomething went wrong. ${errors?.[0]?.message}`)
      }

      const lists: any = data?.MediaListCollection?.lists
      if (!lists || lists.length === 0) {
        return console.log(`\nYou seem to have no anime(s) in your lists.`)
      }

      const { selectedList } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedList",
          message: "Select an anime list:",
          choices: lists.map((list: any) => list.name),
        },
      ])

      const selectedEntries = lists.find(
        (list: any) => list.name === selectedList
      )

      if (!selectedEntries || !selectedEntries.entries.length) {
        return console.log(
          `\nNo entries found or not available at this moment.`
        )
      }

      console.log(`\nEntries for '${selectedEntries.name}':`)

      const { selectedAnime } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedAnime",
          message: "Select anime to add to the list:",
          choices: selectedEntries.entries.map((entry: any, idx: number) => ({
            name: `[${idx + 1}] ${getTitle(entry.media.title)}`,
            value: entry.media.id,
          })),
          pageSize: 10,
        },
      ])

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

      const query = addAnimeToListMutation
      const variables = { mediaId: selectedAnime, status: selectedListType }

      const saveResponse: any = await fetcher(query, variables)

      if (saveResponse) {
        const savedEntry = saveResponse.data?.SaveMediaListEntry
        console.log(
          `\nEntry ${savedEntry?.id}. Saved as ${savedEntry?.status}.`
        )
      } else {
        console.error(`\nPlease log in first to use this feature.`)
      }
    } catch (error) {
      console.log(`\nSomething went wrong. ${(error as Error).message}`)
    }
  }
  static async MyManga() {
    try {
      if (!(await Auth.isLoggedIn())) {
        return console.error(`\nPlease log in first to access your lists.`)
      }

      const userId = await Auth.MyUserId()
      if (!userId) {
        return console.error(`\nFailed to get the current user ID.`)
      }

      const token = await Auth.RetriveAccessToken()
      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: currentUserMangaList,
          variables: { id: userId },
        }),
      })

      const { data, errors }: AnimeList = await request.json()

      if (request.status !== 200 || errors) {
        return console.error(
          `\nFailed to fetch manga lists. ${errors?.[0]?.message || "Unknown error"}`
        )
      }

      const lists = data?.MediaListCollection?.lists
      if (!lists || lists.length === 0) {
        return console.log("\nYou don't seem to have any manga in your lists.")
      }

      const { selectedList } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedList",
          message: "Select a manga list:",
          choices: lists.map((list: any) => list.name),
        },
      ])

      const selectedEntries = lists.find(
        (list: any) => list.name === selectedList
      )
      if (!selectedEntries || selectedEntries.entries.length === 0) {
        return console.log("\nNo manga entries found in the selected list.")
      }

      console.log(`\nEntries for '${selectedEntries.name}':`)

      const { selectedManga } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedManga",
          message: "Select a manga to add to the list:",
          choices: selectedEntries.entries.map((entry: any, idx: number) => ({
            name: `[${idx + 1}] ${getTitle(entry.media.title)}`,
            value: entry?.media?.id,
          })),
          pageSize: 10,
        },
      ])

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

      const saveRequest = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: addMangaToListMutation,
          variables: { mediaId: selectedManga, status: selectedListType },
        }),
      })

      const saveResponse: any = await saveRequest.json()
      const saved = saveResponse?.data?.SaveMediaListEntry

      if (saved) {
        console.log(`\nEntry ${saved.id}. Saved as ${saved.status}.`)
      } else {
        console.error(
          `\nFailed to save the manga. ${saveResponse?.errors?.[0]?.message || "Unknown error"}`
        )
      }
    } catch (error) {
      console.error(`\nSomething went wrong. ${error.message}`)
    }
  }
  static async getTrendingAnime(count: number) {
    try {
      let page = 1
      let allTrending: any[] = []

      while (true) {
        const request = await fetch(aniListEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: trendingQuery,
            variables: { page, perPage: count },
          }),
        })

        const { data, errors }: any = await request.json()

        if (request.status !== 200 || errors) {
          console.error(
            `\nSomething went wrong. ${errors?.[0]?.message || "Unknown error"}`
          )
          return
        }

        const media = data?.Page?.media
        if (!media || media.length === 0) {
          console.log(`\nNo more trending anime available.`)
          break
        }

        allTrending = [...allTrending, ...media]

        const choices = allTrending.map((anime: any, idx: number) => ({
          name: `[${idx + 1}] ${getTitle(anime?.title)}`,
          value: anime?.id,
        }))
        choices.push({ name: "See more", value: "see_more" })

        const { selectedAnime } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedAnime",
            message: "Select anime to add to the list:",
            choices,
            pageSize: choices.length + 1,
          },
        ])

        if (selectedAnime === "see_more") {
          page++
          continue
        } else {
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

          if (!(await Auth.isLoggedIn())) {
            console.error(`\nPlease log in first to use this feature.`)
            return
          }

          const variables = { mediaId: selectedAnime, status: selectedListType }
          const saveResponse: any = await fetcher(
            addAnimeToListMutation,
            variables
          )

          const saved = saveResponse?.data?.SaveMediaListEntry
          if (saved) {
            console.log(`\nEntry ${saved.id}. Saved as ${saved.status}.`)
          } else {
            console.error(
              `\nFailed to save the anime. ${saveResponse?.errors?.[0]?.message || "Unknown error"}`
            )
          }
          break
        }
      }
    } catch (error) {
      console.error(`\nSomething went wrong. ${error.message}`)
    }
  }
  static async getPopularAnime(count: number) {
    try {
      let page = 1
      let allMedia: any[] = []

      while (true) {
        const request = await fetch(aniListEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: popularQuery,
            variables: { page, perPage: count },
          }),
        })

        const { data, errors }: any = await request.json()

        if (request.status !== 200 || errors) {
          console.error(
            `\nSomething went wrong. ${errors?.[0]?.message || "Unknown error"}`
          )
          return
        }

        const newMedia = data?.Page?.media
        if (!newMedia || newMedia.length === 0) {
          console.log(`\nNo more popular anime available.`)
          break
        }

        allMedia = [...allMedia, ...newMedia]

        const choices = allMedia.map((anime: any, idx: number) => ({
          name: `[${idx + 1}] ${getTitle(anime?.title)}`,
          value: anime?.id,
        }))
        choices.push({ name: "See more", value: "see_more" })

        const { selectedAnime } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedAnime",
            message: "Select anime to add to the list:",
            choices,
            pageSize: choices.length,
          },
        ])

        if (selectedAnime === "see_more") {
          page++
          continue
        } else {
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

          if (!(await Auth.isLoggedIn())) {
            return console.error(`\nPlease log in first to use this feature.`)
          }

          const variables = { mediaId: selectedAnime, status: selectedListType }
          const saveResponse: any = await fetcher(
            addAnimeToListMutation,
            variables
          )

          const saved = saveResponse?.data?.SaveMediaListEntry
          if (saved) {
            console.log(`\nEntry ${saved.id}. Saved as ${saved.status}.`)
          } else {
            console.error(
              `\nFailed to save the anime. ${saveResponse?.errors?.[0]?.message || "Unknown error"}`
            )
          }
          break
        }
      }
    } catch (error) {
      console.error(`\nSomething went wrong. ${error.message}`)
    }
  }
  static async getUpcomingAnime(count: number) {
    try {
      const { nextSeason, nextYear } = getNextSeasonAndYear()
      let page = 1
      let allUpcoming: any[] = []

      while (true) {
        const request: any = await fetcher(upcomingAnimesQuery, {
          nextSeason,
          nextYear,
          page,
          perPage: count,
        })

        if (!request || !request.data) {
          console.error(
            `\nSomething went wrong. ${request?.errors?.[0]?.message || "Unknown error"}`
          )
          return
        }

        const newUpcoming = request.data.Page.media ?? []
        if (newUpcoming.length === 0) {
          console.log(`\nNo more upcoming anime available.`)
          break
        }

        allUpcoming = [...allUpcoming, ...newUpcoming]

        const choices = allUpcoming.map((anime: any, idx: number) => ({
          name: `[${idx + 1}] ${getTitle(anime?.title)}`,
          value: anime?.id,
        }))
        choices.push({ name: "See more", value: "see_more" })

        const { selectedAnime } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedAnime",
            message: "Select anime to add to the list:",
            choices,
            pageSize: choices.length + 2,
          },
        ])

        if (selectedAnime === "see_more") {
          page++
          continue
        } else {
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

          if (!(await Auth.isLoggedIn())) {
            return console.error(`\nPlease log in first to use this feature.`)
          }

          const variables = { mediaId: selectedAnime, status: selectedListType }
          const saveResponse: any = await fetcher(
            addAnimeToListMutation,
            variables
          )

          const saved = saveResponse?.data?.SaveMediaListEntry
          if (saved) {
            console.log(`\nEntry ${saved.id}. Saved as ${saved.status}.`)
          } else {
            console.error(
              `\nFailed to save the anime. ${saveResponse?.errors?.[0]?.message || "Unknown error"}`
            )
          }
          break
        }
      }
    } catch (error) {
      console.error(`\nError getting upcoming animes. ${error.message}`)
    }
  }
  static async getUserByUsername(username: string) {
    try {
      const headers = {
        "Content-Type": "application/json",
      }

      if (await Auth.isLoggedIn()) {
        headers["Authorization"] = `Bearer ${await Auth.RetriveAccessToken()}`
      }

      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: userQuery, variables: { username } }),
      })
      const response: any = await request.json()

      if (request.status !== 200 || !response?.data?.User) {
        return console.error(
          `\n${request.status} ${response?.errors?.[0]?.message || "Unknown error"}`
        )
      }

      const user = response.data.User
      const userActivityResponse: any = await fetcher(userActivityQuery, {
        id: user.id,
        page: 1,
        perPage: 10,
      })
      const activities = userActivityResponse?.data?.Page?.activities ?? []

      console.log(`\nID:\t\t${user.id}`)
      console.log(`Name:\t\t${user.name}`)
      console.log(`Site URL:\t${user.siteUrl}`)
      console.log(`Donator Tier:\t${user.donatorTier}`)
      console.log(`Donator Badge:\t${user.donatorBadge}`)
      console.log(
        `Account Created:\t${user.createdAt ? new Date(user.createdAt * 1000).toUTCString() : "N/A"}`
      )
      console.log(
        `Account Updated:\t${user.updatedAt ? new Date(user.updatedAt * 1000).toUTCString() : "N/A"}`
      )
      console.log(`Blocked:\t${user.isBlocked}`)
      console.log(`Follower:\t${user.isFollower}`)
      console.log(`Following:\t${user.isFollowing}`)
      console.log(`Profile Color:\t${user.options?.profileColor}`)
      console.log(`Timezone:\t${user.options?.timezone}`)
      console.log(
        `\nStatistics (Anime)\nCount: ${user.statistics?.anime?.count || 0} Episodes Watched: ${user.statistics?.anime?.episodesWatched || 0} Minutes Watched: ${user.statistics?.anime?.minutesWatched || 0}`
      )
      console.log(
        `Statistics (Manga)\nCount: ${user.statistics?.manga?.count || 0} Chapters Read: ${user.statistics?.manga?.chaptersRead || 0} Volumes Read: ${user.statistics?.manga?.volumesRead || 0}`
      )

      if (activities.length > 0) {
        console.log(`\nRecent Activities:`)
        activities.forEach(({ status, progress, media }) => {
          console.log(
            `${status} ${progress ? `${progress} of ` : ""}${getTitle(media?.title)}`
          )
        })
      } else {
        console.log("\nNo recent activities.")
      }
    } catch (error) {
      console.error(`\nSomething went wrong. ${error.message}`)
    }
  }
  static async getAnimeDetailsByID(anilistID: number) {
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
      console.log(`Title: ${title?.userPreferred || getTitle(title)}`)
      console.log(`Description: ${removeHtmlAndMarkdown(description)}`)
      console.log(`Episode Duration: ${duration || "Unknown"} min`)
      console.log(`Origin: ${countryOfOrigin || "N/A"}`)
      console.log(`Status: ${status || "N/A"}`)
      console.log(`Format: ${format || "N/A"}`)
      console.log(`Genres: ${genres.length ? genres.join(", ") : "N/A"}`)
      console.log(`Season: ${season || "N/A"}`)
      console.log(`Url: ${siteUrl || "N/A"}`)
      console.log(`isAdult: ${isAdult ? "Yes" : "No"}`)
      console.log(`Released: ${formatDateObject(startDate) || "Unknown"}`)
      console.log(`Finished: ${formatDateObject(endDate) || "Ongoing"}`)
    }
  }
  static async searchAnime(search: string, count: number) {
    const query = animeSearchQuery
    const variables = { search, page: 1, perPage: count }

    const searchResults: any = await fetcher(query, variables)

    if (searchResults) {
      const results = searchResults?.data?.Page?.media

      if (results.length > 0) {
        const { selectedAnime } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedAnime",
            message: "Select anime to add to your list:",
            choices: results.map((res: any, idx: number) => ({
              name: `[${idx + 1}] ${getTitle(res?.title)}`,
              value: res?.id,
            })),
            pageSize: 10,
          },
        ])

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

        // Save selected anime to chosen list type
        if (await Auth.isLoggedIn()) {
          const saveQuery = addAnimeToListMutation
          const saveVariables = {
            mediaId: selectedAnime,
            status: selectedListType,
          }

          const response: any = await fetcher(saveQuery, saveVariables)

          if (response) {
            const saved = response?.data?.SaveMediaListEntry
            console.log(`\nEntry ${saved?.id}. Saved as ${saved?.status}.`)
          }
        } else {
          console.error(`\nPlease log in first to use this feature.`)
        }
      } else {
        console.log(`\nNo search results found.`)
      }
    } else {
      console.error(`\nSomething went wrong.`)
    }
  }
  static async searchManga(search: string, count: number) {
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
}

class MyAnimeList {
  static async importAnime() {
    try {
      const filename = await selectFile(".xml")
      const filePath = join(getDownloadFolderPath(), filename)
      const fileContent = await readFile(filePath, "utf8")
      const parser = new XMLParser()

      if (fileContent) {
        const XMLObject = parser.parse(fileContent)
        const animeList = XMLObject?.myanimelist?.anime

        if (animeList?.length > 0) {
          let count = 0
          const statusMap = {
            "On-Hold": AniListMediaStatus.PAUSED,
            "Dropped": AniListMediaStatus.DROPPED,
            "Completed": AniListMediaStatus.COMPLETED,
            "Watching": AniListMediaStatus.CURRENT,
            "Plan to Watch": AniListMediaStatus.PLANNING,
          }

          for (const anime of animeList) {
            const malId = anime.series_animedb_id
            const progress = anime.my_watched_episodes
            const status = statusMap[anime.my_status]

            try {
              // Fetch AniList ID using MAL ID
              const anilistResponse: MalIdToAnilistIdResponse = await fetcher(
                malIdToAnilistAnimeId,
                { malId }
              )
              const anilistId = anilistResponse?.data?.Media?.id

              if (anilistId) {
                // Save anime entry with progress
                const saveResponse: saveAnimeWithProgressResponse =
                  await fetcher(saveAnimeWithProgressMutation, {
                    mediaId: anilistId,
                    progress,
                    status,
                    hiddenFromStatusLists: false,
                    private: false,
                  })
                const entryId = saveResponse?.data?.SaveMediaListEntry?.id

                if (entryId) {
                  count++
                  console.log(`[${count}] ${entryId} ✅`)
                }

                // Rate limit each API call to avoid server overload
                await new Promise((resolve) => setTimeout(resolve, 1100))
              } else {
                console.error(
                  `Could not retrieve AniList ID for MAL ID ${malId}`
                )
              }
            } catch (error) {
              console.error(
                `Error processing MAL ID ${malId}: ${(error as Error).message}`
              )
            }
          }

          console.log(`\nTotal Entries Processed: ${count}`)
        } else {
          console.log(`\nNo anime list found in the file.`)
        }
      }
    } catch (error) {
      console.error(
        `\nError in MAL import process: ${(error as Error).message}`
      )
    }
  }
  static async importManga() {
    try {
      const filename = await selectFile(".xml")
      const filePath = join(getDownloadFolderPath(), filename)
      const fileContent = await readFile(filePath, "utf8")
      const parser = new XMLParser()

      if (fileContent) {
        const XMLObject = parser.parse(fileContent)
        const mangas = XMLObject?.myanimelist?.manga

        if (mangas?.length > 0) {
          let count = 0
          const statusMap = {
            "On-Hold": AniListMediaStatus.PAUSED,
            "Dropped": AniListMediaStatus.DROPPED,
            "Completed": AniListMediaStatus.COMPLETED,
            "Reading": AniListMediaStatus.CURRENT,
            "Plan to Read": AniListMediaStatus.PLANNING,
          }

          for (const manga of mangas) {
            const malId = manga.manga_mangadb_id
            const progress = manga.my_read_chapters
            const status = statusMap[manga.my_status]

            try {
              // Fetch AniList ID using MAL ID
              const anilistResponse: MalIdToAnilistIdResponse = await fetcher(
                malIdToAnilistMangaId,
                { malId }
              )
              const anilistId = anilistResponse?.data?.Media?.id

              if (anilistId) {
                // Save manga entry with progress
                const saveResponse: saveAnimeWithProgressResponse =
                  await fetcher(saveMangaWithProgressMutation, {
                    mediaId: anilistId,
                    progress,
                    status,
                    hiddenFromStatusLists: false,
                    private: false,
                  })
                const entryId = saveResponse?.data?.SaveMediaListEntry?.id

                if (entryId) {
                  count++
                  console.log(`[${count}] ${entryId} ✅`)
                } else {
                  console.error(`Failed to save entry for ${malId}`)
                }
              } else {
                console.error(
                  `Could not retrieve AniList ID for MAL ID ${malId}`
                )
              }
            } catch (error) {
              console.error(
                `Error processing MAL ID ${malId}: ${(error as Error).message}`
              )
            }
          }

          console.log(`\nTotal Entries Processed: ${count}`)
        } else {
          console.log(`\nNo manga list seems to be found.`)
        }
      }
    } catch (error) {
      console.error(`\nError from MAL import: ${(error as Error).message}`)
    }
  }
  static async exportAnime() {
    try {
      if (await Auth.isLoggedIn()) {
        const animeList: AnimeList = await fetcher(currentUserAnimeList, {
          id: await Auth.MyUserId(),
        })
        if (animeList?.data?.MediaListCollection?.lists.length > 0) {
          const lists = animeList?.data?.MediaListCollection?.lists
          const mediaWithProgress = lists.flatMap((list: any) =>
            list.entries.map((entry: any) => ({
              id: entry?.media?.id,
              malId: entry?.media?.idMal,
              title: entry?.media?.title,
              episodes: entry?.media?.episodes,
              siteUrl: entry?.media?.siteUrl,
              progress: entry.progress,
              status: entry?.status,
              hiddenFromStatusLists: false,
            }))
          )
          const xmlContent = createAnimeListXML(mediaWithProgress)
          const path = join(
            getDownloadFolderPath(),
            `${await Auth.MyUserName()}@irfanshadikrishad-anilist-myanimelist(anime)-${getFormattedDate()}.xml`
          )
          await writeFile(path, await xmlContent, "utf8")
          console.log(`Generated XML for MyAnimeList.`)

          open(getDownloadFolderPath())
        } else {
          console.log(
            `\nHey, ${await Auth.MyUserName()}. Your anime list seems to be empty.`
          )
        }
      }
    } catch (error) {
      console.error(`\nError from MALexport. ${(error as Error).message}`)
    }
  }
  static async exportManga() {
    try {
      if (!(await Auth.isLoggedIn())) {
        console.log(`\nPlease login to use this feature.`)
        return
      }
      const mangaList: AnimeList = await fetcher(currentUserMangaList, {
        id: await Auth.MyUserId(),
      })
      if (mangaList && mangaList?.data?.MediaListCollection?.lists.length > 0) {
        const lists = mangaList?.data?.MediaListCollection?.lists
        const mediaWithProgress = lists.flatMap((list: any) =>
          list.entries.map((entry: any) => ({
            id: entry?.media?.id,
            malId: entry?.media?.idMal,
            title: entry?.media?.title,
            private: entry.private,
            chapters: entry.media.chapters,
            progress: entry.progress,
            status: entry?.status,
            hiddenFromStatusLists: entry.hiddenFromStatusLists,
          }))
        )
        const XMLContent = createMangaListXML(mediaWithProgress)
        const path = join(
          getDownloadFolderPath(),
          `${await Auth.MyUserName()}@irfanshadikrishad-anilist-myanimelist(manga)-${getFormattedDate()}.xml`
        )
        await writeFile(path, await XMLContent, "utf8")
        console.log(`Generated XML for MyAnimeList.`)

        open(getDownloadFolderPath())
      } else {
        console.log(
          `\nHey, ${await Auth.MyUserName()}. Your anime list seems to be empty.`
        )
      }
    } catch (error) {
      console.error(`\nError from MALexport. ${(error as Error).message}`)
    }
  }
}

export { AniList, MyAnimeList }
