import fs from "fs"
import inquirer from "inquirer"
import fetch from "node-fetch"
import open from "open"
import os from "os"
import path from "path"
import { fetcher } from "./fetcher.js"
import { AniList, MyAnimeList } from "./lists.js"
import {
  deleteActivityMutation,
  likeActivityMutation,
  saveTextActivityMutation,
} from "./mutations.js"
import {
  activityAllQuery,
  activityAnimeListQuery,
  activityMangaListQuery,
  activityMediaList,
  activityMessageQuery,
  activityTextQuery,
  currentUserAnimeList,
  currentUserMangaList,
  currentUserQuery,
  deleteMangaEntryMutation,
  deleteMediaEntryMutation,
  followingActivitiesQuery,
  userActivityQuery,
} from "./queries.js"
import { DeleteMangaResponse } from "./types.js"
import { aniListEndpoint, getTitle, redirectUri } from "./workers.js"

const home_dir = os.homedir()
const save_path = path.join(home_dir, ".anilist_token")

class Auth {
  /**
   * Get access-token from user
   */
  static async GetAccessToken() {
    try {
      const { token } = await inquirer.prompt([
        {
          type: "password",
          name: "token",
          message: "Please enter your AniList access token:",
        },
      ])
      return token
    } catch (error) {
      console.error(`\nSomething went wrong. ${(error as Error).message}`)
    }
  }
  static async StoreAccessToken(token: string) {
    try {
      fs.writeFileSync(save_path, token, { encoding: "utf8" })
    } catch (error) {
      console.error(`\nError storing acess-token. ${(error as Error).message}`)
    }
  }
  static async RetriveAccessToken() {
    try {
      if (fs.existsSync(save_path)) {
        return fs.readFileSync(save_path, { encoding: "utf8" })
      } else {
        return null
      }
    } catch (error) {
      console.error(
        `\nError retriving acess-token. ${(error as Error).message}`
      )
    }
  }
  static async Login(clientId: number, clientSecret: string) {
    try {
      console.log("Starting AniList login...")
      const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`
      console.log("Opening browser for AniList login...")
      open(authUrl)

      const authCode = await Auth.GetAccessToken()

      const tokenResponse = await fetch(
        "https://anilist.co/api/v2/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            grant_type: "authorization_code",
            client_id: String(clientId),
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code: authCode,
          }),
        }
      )

      const token_Data: any = await tokenResponse.json()

      if (token_Data?.access_token) {
        await Auth.StoreAccessToken(token_Data?.access_token)
        const name = await Auth.MyUserName()
        if (name) {
          console.log(`\nWelcome Back, ${name}!`)
        } else {
          console.log(`\nLogged in successfull!`)
        }
      } else {
        console.error("\nFailed to get access token:", token_Data)
      }
    } catch (error) {
      console.error(`\nFailed logging in. ${(error as Error).message}`)
    }
  }
  static async Myself() {
    try {
      if (await Auth.isLoggedIn()) {
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await Auth.RetriveAccessToken()}`,
        }
        const request = await fetch(aniListEndpoint, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ query: currentUserQuery }),
        })
        const { data, errors }: any = await request.json()

        if (request.status === 200) {
          const user = data?.Viewer
          const activiResponse: any = await fetcher(userActivityQuery, {
            id: user?.id,
            page: 1,
            perPage: 10,
          })
          const activities = activiResponse?.data?.Page?.activities

          console.log(`
ID:                     ${user?.id}
Name:                   ${user?.name}
siteUrl:                ${user?.siteUrl}
profileColor:           ${user?.options?.profileColor}
timeZone:               ${user?.options?.timezone}
activityMergeTime:      ${user?.options?.activityMergeTime}
donatorTier:            ${user?.donatorTier}
donatorBadge:           ${user?.donatorBadge}
unreadNotificationCount:${user?.unreadNotificationCount}
Account Created:        ${new Date(user?.createdAt * 1000).toUTCString()}
Account Updated:        ${new Date(user?.updatedAt * 1000).toUTCString()}
      
Statistics (Anime):
  Count:                ${user?.statistics?.anime?.count}
  Mean Score:           ${user?.statistics?.anime?.meanScore}
  Minutes Watched:      ${user?.statistics?.anime?.minutesWatched}
      
Statistics (Manga):
  Count:                ${user?.statistics?.manga?.count}
  Chapters Read:        ${user?.statistics?.manga?.chaptersRead}
  Volumes Read:         ${user?.statistics?.manga?.volumesRead}
`)

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

          return user
        } else {
          console.error(
            `\nSomething went wrong. Please log in again. ${errors[0].message}`
          )
          return null
        }
      } else {
        console.error(`\nPlease login first to use this feature.`)
        return null
      }
    } catch (error) {
      console.error(`\nError from Myself. ${(error as Error).message}`)
    }
  }
  static async isLoggedIn() {
    try {
      if ((await Auth.RetriveAccessToken()) !== null) {
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error(`\nError getting isLoggedIn. ${(error as Error).message}`)
    }
  }
  static async Logout() {
    try {
      const username = await Auth.MyUserName()
      if (fs.existsSync(save_path)) {
        try {
          fs.unlinkSync(save_path)
          console.log(`\nLogout successful. See you soon, ${username}.`)
        } catch (error) {
          console.error("\nError logging out:", error)
        }
      } else {
        console.error("\nYou may already be logged out.")
      }
    } catch (error) {
      console.error(`\nError logging out. ${(error as Error).message}`)
    }
  }
  static async MyUserId() {
    if (!(await Auth.isLoggedIn())) {
      console.log(`\nUser not logged in.`)
      return null
    }

    const token = await Auth.RetriveAccessToken()
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ query: currentUserQuery }),
    })

    if (!(request.status === 200)) {
      console.error(`Failed to fetch user data. Status: ${request.status}`)
      return null
    }

    const { data }: any = await request.json()
    return data?.Viewer?.id ?? null
  }
  static async MyUserName() {
    if (!(await Auth.isLoggedIn())) {
      console.log(`\nUser not logged in.`)
      return null
    }

    const token = await Auth.RetriveAccessToken()
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ query: currentUserQuery }),
    })

    if (!request.ok) {
      console.error(`Failed to fetch user data. Status: ${request.status}`)
      return null
    }

    const { data }: any = await request.json()
    return data?.Viewer?.name ?? null
  }
  static async DeleteMyActivities() {
    try {
      if (await Auth.isLoggedIn()) {
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
        const userId = await Auth.MyUserId()
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
            userId: await Auth.MyUserId(),
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
                  const isDeleted =
                    deleteResponse?.data?.DeleteActivity?.deleted
                  count++

                  console.log(
                    `[${count}/${activities.length}] ${act?.id} ${
                      isDeleted ? "✅" : "❌"
                    }`
                  )

                  // Avoiding rate-limit
                  await new Promise((resolve) => setTimeout(resolve, 1100))
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
    } catch (error) {
      console.error(`\nSomething went wrong. ${(error as Error).message}`)
    }
  }
  static async DeleteMyAnimeList() {
    if (await Auth.isLoggedIn()) {
      const userID = await Auth.MyUserId()
      if (userID) {
        const request = await fetch(aniListEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Authorization": `Bearer ${await Auth.RetriveAccessToken()}`,
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
                  await Auth.DeleteAnimeById(entry?.id, entry?.media?.title)
                  await new Promise((resolve) => setTimeout(resolve, 1100))
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
  static async DeleteAnimeById(id: number, title?: any) {
    try {
      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": `Bearer ${await Auth.RetriveAccessToken()}`,
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
  static async DeleteMyMangaList() {
    try {
      if (await Auth.isLoggedIn()) {
        const userID = await Auth.MyUserId()
        if (userID) {
          const request = await fetch(aniListEndpoint, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "Authorization": `Bearer ${await Auth.RetriveAccessToken()}`,
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
                    await Auth.DeleteMangaById(entry?.id, entry?.media?.title)
                    await new Promise((resolve) => setTimeout(resolve, 1100))
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
            console.error(
              `\nSomething went wrong. ${response?.errors[0]?.message}`
            )
          }
        } else {
          console.error(`\nFailed getting current user Id.`)
        }
      } else {
        console.error(`\nPlease log in first to delete your lists.`)
      }
    } catch (error) {
      console.error(`\nError deleting manga.`)
    }
  }
  static async DeleteMangaById(id: number, title?: any) {
    try {
      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await Auth.RetriveAccessToken()}`,
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
  static async Write(status: string) {
    try {
      if (!(await Auth.isLoggedIn())) {
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
  static async callAnimeImporter() {
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
  static async callMangaImporter() {
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
  private static async likeFollowing() {
    try {
      let page = 1
      let hasMoreActivities = true

      while (hasMoreActivities) {
        const activities: any = await fetcher(followingActivitiesQuery, {
          page,
          perPage: 50,
        })

        if (activities && activities?.data?.Page?.activities.length > 0) {
          const activiti = activities?.data?.Page?.activities

          for (let activ of activiti) {
            if (!activ.isLiked && activ.id) {
              const like: any = await fetcher(likeActivityMutation, {
                activityId: activ.id,
              })
              const ToggleLike = like?.data?.ToggleLike
              console.info(`[${activ.id}] liked ${activ.user.name}`)
            } else {
              console.log(`[${activ?.id}] ${activ.user.name} already-liked`)
            }
            // avoiding rate-limit
            await new Promise((resolve) => {
              setTimeout(resolve, 2000)
            })
          }

          page++
        } else {
          // No more activities to like
          console.log(`\nProbably the end of activities.`)
          console.info(activities)
          hasMoreActivities = false
        }
      }
    } catch (error) {
      console.error(`\nError from likeFollowing. ${(error as Error).message}`)
    }
  }

  static async AutoLike() {
    try {
      if (!(await Auth.isLoggedIn())) {
        console.error(`\nPlease login to use this feature.`)
        return
      }
      const { activityType } = await inquirer.prompt([
        {
          type: "list",
          name: "activityType",
          message: "Select activity type:",
          choices: [
            { name: "Following", value: 1 },
            { name: "Global", value: 2 },
          ],
          pageSize: 10,
        },
      ])
      switch (activityType) {
        case 1:
          await this.likeFollowing()
          break
        case 2:
          console.warn(`\nNot yet implemented!`)
          break
        default:
          console.error(`\nInvalid choice. (${activityType})`)
      }
    } catch (error) {
      console.error(`\nError from autolike. ${(error as Error).message}`)
    }
  }
}

export { Auth }
