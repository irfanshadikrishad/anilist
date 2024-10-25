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
  MALAnimeXML,
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
      if (await Auth.isLoggedIn()) {
        if (await Auth.MyUserId()) {
          const request = await fetch(aniListEndpoint, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "Authorization": `Bearer ${await Auth.RetriveAccessToken()}`,
            },
            body: JSON.stringify({
              query: currentUserAnimeList,
              variables: { id: await Auth.MyUserId() },
            }),
          })
          const response: any = await request.json()

          if (request.status === 200) {
            const lists = response?.data?.MediaListCollection?.lists
            if (lists.length > 0) {
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
              if (selectedEntries) {
                console.log(`\nEntries for '${selectedEntries.name}':`)

                if (selectedEntries?.entries?.length > 0) {
                  const { selectedAnime } = await inquirer.prompt([
                    {
                      type: "list",
                      name: "selectedAnime",
                      message: "Select anime to add to the list:",
                      choices: selectedEntries?.entries.map(
                        (upx: any, idx: number) => ({
                          name: `[${idx + 1}] ${getTitle(upx?.media?.title)}`,
                          value: upx?.media?.id,
                        })
                      ),
                      pageSize: 10,
                    },
                  ])
                  // Where to save
                  const { selectedListType } = await inquirer.prompt([
                    {
                      type: "list",
                      name: "selectedListType",
                      message:
                        "Select the list where you want to save this anime:",
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
                    const variables = {
                      mediaId: selectedAnime,
                      status: selectedListType,
                    }

                    const response: any = await fetcher(query, variables)

                    if (response) {
                      const saved = response?.data?.SaveMediaListEntry
                      console.log(
                        `\nEntry ${saved?.id}. Saved as ${saved?.status}.`
                      )
                    }
                  } else {
                    console.error(`\nPlease log in first to use this feature.`)
                  }
                } else {
                  console.log(`\nNot available at this moment.`)
                }
              } else {
                console.log("\nNo entries found.")
              }
            } else {
              console.log(`\nYou seems to have no anime(s) in your lists.`)
            }
          } else {
            console.log(
              `\nSomething went wrong. ${response?.errors[0]?.message}`
            )
          }
        } else {
          console.log(`\nFailed getting current user Id.`)
        }
      } else {
        console.error(`\nPlease log in first to access your lists.`)
      }
    } catch (error) {
      console.log(`\nSomething went wrong. ${(error as Error).message}`)
    }
  }
  static async MyManga() {
    try {
      if (await Auth.isLoggedIn()) {
        if (await Auth.MyUserId()) {
          const request = await fetch(aniListEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${await Auth.RetriveAccessToken()}`,
            },
            body: JSON.stringify({
              query: currentUserMangaList,
              variables: { id: await Auth.MyUserId() },
            }),
          })

          const response: any = await request.json()

          if (request.status === 200 && response?.data?.MediaListCollection) {
            const lists = response.data.MediaListCollection.lists

            if (lists && lists.length > 0) {
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

              if (selectedEntries && selectedEntries.entries.length > 0) {
                console.log(`\nEntries for '${selectedEntries.name}':`)

                const { selectedManga } = await inquirer.prompt([
                  {
                    type: "list",
                    name: "selectedManga",
                    message: "Select a manga to add to the list:",
                    choices: selectedEntries.entries.map(
                      (entry: any, idx: number) => ({
                        name: `[${idx + 1}] ${getTitle(entry.media.title)}`,
                        value: entry?.media?.id,
                      })
                    ),
                    pageSize: 10,
                  },
                ])

                // Prompt user to select list type to save to
                const { selectedListType } = await inquirer.prompt([
                  {
                    type: "list",
                    name: "selectedListType",
                    message:
                      "Select the list where you want to save this manga:",
                    choices: [
                      { name: "Planning", value: "PLANNING" },
                      { name: "Reading", value: "CURRENT" },
                      { name: "Completed", value: "COMPLETED" },
                      { name: "Paused", value: "PAUSED" },
                      { name: "Dropped", value: "DROPPED" },
                    ],
                  },
                ])

                // Save the selected manga to the selected list type
                if (await Auth.isLoggedIn()) {
                  const query = addMangaToListMutation
                  const variables = {
                    mediaId: selectedManga,
                    status: selectedListType,
                  }

                  const saveRequest = await fetch(aniListEndpoint, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${await Auth.RetriveAccessToken()}`,
                    },
                    body: JSON.stringify({ query, variables }),
                  })

                  const saveResponse: any = await saveRequest.json()

                  if (saveResponse?.data?.SaveMediaListEntry) {
                    const saved = saveResponse.data.SaveMediaListEntry
                    console.log(
                      `\nEntry ${saved.id}. Saved as ${saved.status}.`
                    )
                  } else {
                    console.error(
                      `\nFailed to save the manga. ${
                        saveResponse?.errors?.[0]?.message || "Unknown error"
                      }`
                    )
                  }
                } else {
                  console.error(`\nPlease log in first to use this feature.`)
                }
              } else {
                console.log("\nNo manga entries found in the selected list.")
              }
            } else {
              console.log("\nYou don't seem to have any manga in your lists.")
            }
          } else {
            console.error(
              `\nFailed to fetch manga lists. ${
                response?.errors?.[0]?.message || "Unknown error"
              }`
            )
          }
        } else {
          console.error(`\nFailed to get the current user ID.`)
        }
      } else {
        console.error(`\nPlease log in first to access your lists.`)
      }
    } catch (error) {
      console.error(`\nSomething went wrong. ${error.message}`)
    }
  }
  static async getTrendingAnime(count: number) {
    try {
      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: trendingQuery,
          variables: { page: 1, perPage: count },
        }),
      })
      const response: any = await request.json()

      if (request.status === 200) {
        const media = response?.data?.Page?.media

        if (media?.length > 0) {
          const { selectedAnime } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedAnime",
              message: "Select anime to add to the list:",
              choices: media.map((upx: any, idx: number) => ({
                name: `[${idx + 1}] ${getTitle(upx?.title)}`,
                value: upx?.id,
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
            const variables = {
              mediaId: selectedAnime,
              status: selectedListType,
            }

            const response: any = await fetcher(query, variables)

            if (response) {
              const saved = response?.data?.SaveMediaListEntry
              console.log(`\nEntry ${saved?.id}. Saved as ${saved?.status}.`)
            }
          } else {
            console.error(`\nPlease log in first to use this feature.`)
          }
        } else {
          console.log(`\nNo trending available at the moment.`)
        }
      } else {
        console.log(`\nSomething went wrong. ${response?.errors[0]?.message}`)
      }
    } catch (error) {
      console.log(`\nSomething went wrong. ${(error as Error).message}`)
    }
  }
  static async getPopularAnime(count: number) {
    try {
      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: popularQuery,
          variables: { page: 1, perPage: count },
        }),
      })
      const response: any = await request.json()
      if (request.status === 200) {
        const media = response?.data?.Page?.media

        if (media?.length > 0) {
          const { selectedAnime } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedAnime",
              message: "Select anime to add to the list:",
              choices: media.map((upx: any, idx: number) => ({
                name: `[${idx + 1}] ${getTitle(upx?.title)}`,
                value: upx?.id,
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
            const variables = {
              mediaId: selectedAnime,
              status: selectedListType,
            }

            const response: any = await fetcher(query, variables)

            if (response) {
              const saved = response?.data?.SaveMediaListEntry
              console.log(`\nEntry ${saved?.id}. Saved as ${saved?.status}.`)
            }
          } else {
            console.error(`\nPlease log in first to use this feature.`)
          }
        } else {
          console.log(`\nNo popular available at this moment.`)
        }
      } else {
        console.log(`\nSomething went wrong. ${response?.errors[0]?.message}`)
      }
    } catch (error) {
      console.log(`\nSomething went wrong. ${(error as Error).message}`)
    }
  }
  static async getUpcomingAnime(count: number) {
    try {
      const { nextSeason, nextYear } = getNextSeasonAndYear()

      const request: any = await fetcher(upcomingAnimesQuery, {
        nextSeason,
        nextYear,
        perPage: count,
      })

      if (request) {
        const upcoming = request?.data?.Page?.media ?? []
        const { selectedAnime } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedAnime",
            message: "Select anime to add to the list:",
            choices: upcoming.map((upx: any, idx: number) => ({
              name: `[${idx + 1}] ${getTitle(upx?.title)}`,
              value: upx?.id,
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
          const variables = { mediaId: selectedAnime, status: selectedListType }

          const response: any = await fetcher(query, variables)

          if (response) {
            const saved = response?.data?.SaveMediaListEntry
            console.log(`\nEntry ${saved?.id}. Saved as ${saved?.status}.`)
          }
        } else {
          console.error(`\nPlease log in first to use this feature.`)
        }
      } else {
        console.error(`\nSomething went wrong. ${request?.errors[0]?.message}`)
      }
    } catch (error) {
      console.error(
        `\nError getting upcoming animes. ${(error as Error).message}`
      )
    }
  }
  static async getUserByUsername(username: string) {
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
  static async searchAnime(search: string, count: number) {
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
        if (XMLObject.myanimelist.anime.length > 0) {
          let count = 0
          const animes: MALAnimeXML[] = XMLObject.myanimelist.anime
          for (let anime of animes) {
            const malId = anime.series_animedb_id
            const progress = anime.my_watched_episodes
            const statusMap = {
              "On-Hold": AniListMediaStatus.PAUSED,
              "Dropped": AniListMediaStatus.DROPPED,
              "Completed": AniListMediaStatus.COMPLETED,
              "Watching": AniListMediaStatus.CURRENT,
              "Plan to Watch": AniListMediaStatus.PLANNING,
            }
            const status = statusMap[anime.my_status]

            const anilist: MalIdToAnilistIdResponse = await fetcher(
              malIdToAnilistAnimeId,
              { malId }
            )
            try {
              if (anilist && anilist.data.Media.id) {
                const id = anilist.data.Media.id
                const saveAnime: saveAnimeWithProgressResponse = await fetcher(
                  saveAnimeWithProgressMutation,
                  {
                    mediaId: id,
                    progress: progress,
                    status: status,
                    hiddenFromStatusLists: false,
                    private: false,
                  }
                )
                if (saveAnime) {
                  const entryId = saveAnime?.data?.SaveMediaListEntry?.id
                  count++
                  console.log(`[${count}] ${entryId} ✅`)

                  // rate-limit
                  await new Promise((resolve) => {
                    setTimeout(resolve, 1100)
                  })
                }
              } else {
                console.error(`could not get anilistId for ${malId}`)
              }
            } catch (error) {
              console.error(`\nMALimport-200 ${(error as Error).message}`)
            }
          }
        } else {
          console.log(`\nNo anime list seems to be found.`)
        }
      }
    } catch (error) {
      console.error(`\nError from MALimport. ${(error as Error).message}`)
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
        if (XMLObject.myanimelist.manga.length > 0) {
          let count = 0
          const mangas = XMLObject.myanimelist.manga
          for (let manga of mangas) {
            const malId = manga.manga_mangadb_id
            const progress = manga.my_read_chapters
            const statusMap = {
              "On-Hold": AniListMediaStatus.PAUSED,
              "Dropped": AniListMediaStatus.DROPPED,
              "Completed": AniListMediaStatus.COMPLETED,
              "Reading": AniListMediaStatus.CURRENT,
              "Plan to Read": AniListMediaStatus.PLANNING,
            }
            const status = statusMap[manga.my_status]

            const anilist: MalIdToAnilistIdResponse = await fetcher(
              malIdToAnilistMangaId,
              {
                malId: malId,
              }
            )
            if (anilist?.data?.Media?.id) {
              const anilistId = anilist?.data?.Media?.id
              if (anilistId) {
                const saveManga: saveAnimeWithProgressResponse = await fetcher(
                  saveMangaWithProgressMutation,
                  {
                    mediaId: anilistId,
                    progress: progress,
                    status: status,
                    hiddenFromStatusLists: false,
                    private: false,
                  }
                )
                if (saveManga) {
                  const entryId = saveManga.data.SaveMediaListEntry.id
                  count++
                  console.log(`[${count}] ${entryId} ✅`)
                }
              }
            }
          }
        } else {
          console.log(`\nNo manga list seems to be found.`)
        }
      }
    } catch (error) {
      console.error(`\nError from MALimport. ${(error as Error).message}`)
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
