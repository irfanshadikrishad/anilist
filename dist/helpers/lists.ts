import inquirer from "inquirer"
import fetch from "node-fetch"
import { currentUsersId, isLoggedIn, retriveAccessToken } from "./auth.js"
import { fetcher } from "./fetcher.js"
import { addAnimeToListMutation, addMangaToListMutation } from "./mutations.js"
import {
  currentUserAnimeList,
  currentUserMangaList,
  deleteMangaEntryMutation,
  deleteMediaEntryMutation,
  popularQuery,
  trendingQuery,
  upcomingAnimesQuery,
} from "./queries.js"
import { DeleteMangaResponse } from "./types.js"
import { aniListEndpoint, getNextSeasonAndYear, getTitle } from "./workers.js"

async function getTrending(count: number) {
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
        if (await isLoggedIn()) {
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
async function getPopular(count: number) {
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
        if (await isLoggedIn()) {
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

async function loggedInUsersAnimeLists() {
  try {
    if (await isLoggedIn()) {
      if (await currentUsersId()) {
        const request = await fetch(aniListEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${await retriveAccessToken()}`,
          },
          body: JSON.stringify({
            query: currentUserAnimeList,
            variables: { id: await currentUsersId() },
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
                if (await isLoggedIn()) {
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
          console.log(`\nSomething went wrong. ${response?.errors[0]?.message}`)
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

async function loggedInUsersMangaLists() {
  try {
    if (await isLoggedIn()) {
      const userID = await currentUsersId()
      if (userID) {
        const request = await fetch(aniListEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await retriveAccessToken()}`,
          },
          body: JSON.stringify({
            query: currentUserMangaList,
            variables: { id: userID },
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

              // Save the selected manga to the selected list type
              if (await isLoggedIn()) {
                const query = addMangaToListMutation
                const variables = {
                  mediaId: selectedManga,
                  status: selectedListType,
                }

                const saveRequest = await fetch(aniListEndpoint, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await retriveAccessToken()}`,
                  },
                  body: JSON.stringify({ query, variables }),
                })

                const saveResponse: any = await saveRequest.json()

                if (saveResponse?.data?.SaveMediaListEntry) {
                  const saved = saveResponse.data.SaveMediaListEntry
                  console.log(`\nEntry ${saved.id}. Saved as ${saved.status}.`)
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

async function deleteAnimeCollection() {
  if (await isLoggedIn()) {
    const userID = await currentUsersId()
    if (userID) {
      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await retriveAccessToken()}`,
        },
        body: JSON.stringify({
          query: currentUserAnimeList,
          variables: { id: userID },
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
              pageSize: 10,
            },
          ])
          const selectedEntries = lists.find(
            (list: any) => list.name === selectedList
          )
          if (selectedEntries) {
            console.log(`\nDeleting entries of '${selectedEntries.name}':`)

            for (const [_, entry] of selectedEntries.entries.entries()) {
              if (entry?.id) {
                await deleteAnimeByAnimeId(entry?.id, entry?.media?.title)
                await new Promise((resolve) => setTimeout(resolve, 2000))
              } else {
                console.log(`No id in entry.`)
                console.log(entry)
              }
            }
          } else {
            console.log("No entries found.")
          }
        } else {
          console.log(`\nNo anime(s) found in any list.`)
        }
      } else {
        console.log(`\nSomething went wrong. ${response?.errors[0]?.message}`)
      }
    } else {
      console.log(`\nFailed getting current user Id.`)
    }
  } else {
    console.error(`\nPlease log in first to delete your lists.`)
  }
}

async function deleteAnimeByAnimeId(id: number, title?: any) {
  try {
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await retriveAccessToken()}`,
      },
      body: JSON.stringify({
        query: deleteMediaEntryMutation,
        variables: { id },
      }),
    })
    const response: any = await request.json()
    if (request.status === 200) {
      const deleted = response?.data?.DeleteMediaListEntry?.deleted
      console.log(
        `del ${title ? getTitle(title) : ""} ${deleted ? "✅" : "❌"}`
      )
    } else {
      console.log(`\nError deleting anime. ${response?.errors[0]?.message}`)
      console.log(response)
    }
  } catch (error) {
    console.log(`\nError deleting anime. ${id} ${(error as Error).message}`)
  }
}

async function deleteMangaCollection() {
  if (await isLoggedIn()) {
    const userID = await currentUsersId()
    if (userID) {
      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await retriveAccessToken()}`,
        },
        body: JSON.stringify({
          query: currentUserMangaList,
          variables: { id: userID },
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
              message: "Select a manga list:",
              choices: lists.map((list: any) => list.name),
              pageSize: 10,
            },
          ])
          const selectedEntries = lists.find(
            (list: any) => list.name === selectedList
          )
          if (selectedEntries) {
            console.log(`\nDeleting entries of '${selectedEntries.name}':`)

            for (const [_, entry] of selectedEntries.entries.entries()) {
              if (entry?.id) {
                await deleteMangaByMangaId(entry?.id, entry?.media?.title)
                await new Promise((resolve) => setTimeout(resolve, 2000))
              } else {
                console.log(`No id in entry.`)
                console.log(entry)
              }
            }
          } else {
            console.error("\nNo entries found.")
          }
        } else {
          console.error(`\nNo manga(s) found in any list.`)
        }
      } else {
        console.error(`\nSomething went wrong. ${response?.errors[0]?.message}`)
      }
    } else {
      console.error(`\nFailed getting current user Id.`)
    }
  } else {
    console.error(`\nPlease log in first to delete your lists.`)
  }
}
async function deleteMangaByMangaId(id: number, title?: any) {
  try {
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await retriveAccessToken()}`,
      },
      body: JSON.stringify({
        query: deleteMangaEntryMutation,
        variables: { id },
      }),
    })

    const { data, errors }: DeleteMangaResponse = await request.json()

    const statusMessage = title ? getTitle(title) : ""

    if (request.ok) {
      const deleted = data?.DeleteMediaListEntry?.deleted
      console.log(`del ${statusMessage} ${deleted ? "✅" : "❌"}`)
    } else {
      console.error(`Error deleting manga. ${errors?.[0]?.message}`)
    }
  } catch (error) {
    console.error(
      `Error deleting manga. ${id} ${
        error instanceof Error ? error.message : error
      }`
    )
  }
}

async function getUpcomingAnimes(count: number) {
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
      if (await isLoggedIn()) {
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

export {
  deleteAnimeCollection,
  deleteMangaCollection,
  getPopular,
  getTrending,
  getUpcomingAnimes,
  loggedInUsersAnimeLists,
  loggedInUsersMangaLists,
}
