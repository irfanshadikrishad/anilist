import fs from "fs"
import inquirer from "inquirer"
import fetch from "node-fetch"
import open from "open"
import os from "os"
import path from "path"
import { fetcher } from "./fetcher.js"
import { AniDB, AniList, MyAnimeList } from "./lists.js"
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
  globalActivitiesQuery,
  specificUserActivitiesQuery,
  userActivityQuery,
  userFollowersQuery,
  userFollowingQuery,
  userQuery,
} from "./queries.js"
import {
  MediaList,
  MediaTitle,
  Myself,
  TheActivity,
  User,
  UserFollower,
  UserFollowing,
} from "./types.js"
import {
  activityBy,
  aniListEndpoint,
  getTitle,
  redirectUri,
  timestampToTimeAgo,
} from "./workers.js"

const home_dir = os.homedir()
const save_path = path.join(home_dir, ".anilist_token")

class Auth {
  /**
   * Get access-token from user
   */
  static async GetAccessToken() {
    try {
      const { token }: { token: string } = await inquirer.prompt([
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

      const authCode: string = await Auth.GetAccessToken()

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

      const token_Data: { access_token?: string } = await tokenResponse.json()

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
        const { data, errors }: Myself = await request.json()

        if (request.status === 200) {
          const user = data?.Viewer
          const activiResponse: {
            data?: {
              Page: {
                activities: {
                  status: string
                  progress: number
                  media: { title: MediaTitle }
                  createdAt: number
                }[]
              }
            }
            errors?: { message: string }[]
          } = await fetcher(userActivityQuery, {
            id: user?.id,
            page: 1,
            perPage: 10,
          })
          const activities = activiResponse?.data?.Page?.activities
          // Get follower/following information
          const req_followers: UserFollower = await fetcher(
            userFollowersQuery,
            {
              userId: user?.id,
            }
          )
          const req_following: UserFollowing = await fetcher(
            userFollowingQuery,
            {
              userId: user?.id,
            }
          )
          const followersCount = req_followers?.data?.Page?.pageInfo?.total || 0
          const followingCount = req_following?.data?.Page?.pageInfo?.total || 0

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

Followers:              ${followersCount}
Following:              ${followingCount}
      
Statistics (Anime):
  Count:                ${user?.statistics?.anime?.count}
  Mean Score:           ${user?.statistics?.anime?.meanScore}
  Minutes Watched:      ${user?.statistics?.anime?.minutesWatched}
  Episodes Watched:     ${user?.statistics?.anime?.episodesWatched}
      
Statistics (Manga):
  Count:                ${user?.statistics?.manga?.count}
  Mean Score:           ${user?.statistics?.manga?.meanScore}
  Chapters Read:        ${user?.statistics?.manga?.chaptersRead}
  Volumes Read:         ${user?.statistics?.manga?.volumesRead}
`)

          console.log(`\nRecent Activities:`)
          if (activities.length > 0) {
            activities.map(({ status, progress, media, createdAt }) => {
              console.log(
                `${timestampToTimeAgo(createdAt)}\t${status} ${progress ? `${progress} of ` : ""}${getTitle(
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
      const username: string = await Auth.MyUserName()
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
      console.warn(`\nUser not logged in.`)
      return null
    }

    const token: string = await Auth.RetriveAccessToken()
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

    const { data }: { data?: { Viewer: { id: number } } } = await request.json()
    return data?.Viewer?.id ?? null
  }
  static async MyUserName() {
    if (!(await Auth.isLoggedIn())) {
      console.log(`\nUser not logged in.`)
      return null
    }

    const token: string = await Auth.RetriveAccessToken()
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

    const { data }: { data?: { Viewer: { name: string } } } =
      await request.json()
    return data?.Viewer?.name ?? null
  }
  static async DeleteMyActivities() {
    try {
      if (await Auth.isLoggedIn()) {
        const { activityType }: { activityType: number } =
          await inquirer.prompt([
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

        const queryMap = {
          0: activityAllQuery,
          1: activityTextQuery,
          2: activityMediaList,
          3: activityAnimeListQuery,
          4: activityMangaListQuery,
          5: activityMessageQuery,
        }
        const query: string = queryMap[activityType]

        let hasMoreActivities: boolean = true
        let totalCount = 0

        while (hasMoreActivities) {
          const response: {
            data?: { Page: { activities: { id: number }[] } }
            //  errors: { message: string }[]
          } = await fetcher(query, {
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
                  const deleteResponse: {
                    data?: { DeleteActivity: { deleted: boolean } }
                    errors?: { message: string }[]
                  } = await fetcher(deleteActivityMutation, {
                    id: act?.id,
                  })
                  const isDeleted =
                    deleteResponse?.data?.DeleteActivity?.deleted
                  count++
                  totalCount++

                  console.log(
                    `[${count}/${activities.length}/${totalCount}]\t${act?.id} ${
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
      const userID: number = await Auth.MyUserId()
      if (userID) {
        const response: {
          data?: {
            MediaListCollection: {
              lists: MediaList[]
            }
          }
          errors?: {
            message: string
          }[]
        } = await fetcher(currentUserAnimeList, { id: userID })

        if (response !== null) {
          const lists: MediaList[] = response?.data?.MediaListCollection?.lists

          if (lists.length > 0) {
            const { selectedList }: { selectedList: string } =
              await inquirer.prompt([
                {
                  type: "list",
                  name: "selectedList",
                  message: "Select an anime list:",
                  choices: lists.map((list: MediaList) => list.name),
                  pageSize: 10,
                },
              ])
            const selectedEntries: MediaList = lists.find(
              (list: MediaList) => list.name === selectedList
            )
            if (selectedEntries) {
              console.log(`\nDeleting entries of '${selectedEntries.name}':`)

              for (const [, entry] of selectedEntries.entries.entries()) {
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
  static async DeleteAnimeById(id: number, title?: MediaTitle) {
    try {
      const response: {
        data?: { DeleteMediaListEntry: { deleted: boolean } }
        errors?: { message: string }[]
      } = await fetcher(deleteMediaEntryMutation, { id: id })

      if (response?.data) {
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
        const userID: number = await Auth.MyUserId()
        if (userID) {
          const response: {
            data?: { MediaListCollection: { lists: MediaList[] } }
            errors?: { message: string }[]
          } = await fetcher(currentUserMangaList, { id: userID })
          if (response?.data) {
            const lists: MediaList[] =
              response?.data?.MediaListCollection?.lists
            if (lists.length > 0) {
              const { selectedList }: { selectedList: string } =
                await inquirer.prompt([
                  {
                    type: "list",
                    name: "selectedList",
                    message: "Select a manga list:",
                    choices: lists.map((list: MediaList) => list.name),
                    pageSize: 10,
                  },
                ])

              const selectedEntries: MediaList = lists.find(
                (list: MediaList) => list.name === selectedList
              )

              if (selectedEntries) {
                console.log(`\nDeleting entries of '${selectedEntries.name}':`)

                for (const [, entry] of selectedEntries.entries.entries()) {
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
      console.error(`\nError deleting manga. ${(error as Error).message}`)
    }
  }
  static async DeleteMangaById(id: number, title?: MediaTitle) {
    try {
      const response: {
        data?: { DeleteMediaListEntry: { deleted: boolean } }
        errors?: { message: string }[]
      } = await fetcher(deleteMangaEntryMutation, { id })

      const statusMessage: string = title ? getTitle(title) : ""

      if (response?.data) {
        const deleted: boolean = response?.data?.DeleteMediaListEntry?.deleted
        console.log(`del ${statusMessage} ${deleted ? "✅" : "❌"}`)
      } else {
        console.error(`Error deleting manga. ${response?.errors?.[0]?.message}`)
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

      const data: {
        data?: { SaveTextActivity: { id: number } }
        errors?: { message: string }[]
      } = await fetcher(saveTextActivityMutation, {
        status:
          status +
          `<br><br><br><br>*Written using [@irfanshadikrishad/anilist](https://www.npmjs.com/package/@irfanshadikrishad/anilist).*`,
      })

      if (!data) {
        console.error(`\nSomething went wrong. ${data}.`)
        return
      }

      const savedActivity: { id: number } = data.data?.SaveTextActivity

      if (savedActivity?.id) {
        console.log(`\n[${savedActivity.id}] status saved successfully!`)
      }
    } catch (error) {
      console.error(`\n${(error as Error).message}`)
    }
  }
  static async callAnimeImporter() {
    try {
      const { source }: { source: number } = await inquirer.prompt([
        {
          type: "list",
          name: "source",
          message: "Select a source:",
          choices: [
            { name: "Exported JSON file.", value: 1 },
            { name: "MyAnimeList (XML)", value: 2 },
            { name: "AniDB (json-large)", value: 3 },
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
        case 3:
          await AniDB.importAnime()
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
      const { source }: { source: number } = await inquirer.prompt([
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
  private static async LikeFollowing() {
    try {
      let page: number = 1
      let hasMoreActivities: boolean = true
      let retryCount: number = 0
      const maxRetries: number = 5

      while (hasMoreActivities) {
        const activities: {
          data?: {
            Page: {
              activities: TheActivity[]
            }
          }
          errors?: { message: string }[]
        } = await fetcher(followingActivitiesQuery, {
          page,
          perPage: 50,
        })

        if (activities && activities?.data?.Page?.activities.length > 0) {
          retryCount = 0 // Reset retry count on successful fetch
          const activiti = activities?.data?.Page?.activities

          for (let activ of activiti) {
            if (!activ.isLiked && activ.id) {
              try {
                const like: { data?: { ToggleLike: { id: number } } } =
                  await fetcher(likeActivityMutation, {
                    activityId: activ.id,
                  })
                console.info(`${activityBy(activ)} ${like?.data ? "✅" : "❌"}`)
              } catch (error) {
                console.error(
                  `Activity possibly deleted. ${(error as Error).message}`
                )
              }
            } else {
              console.log(`${activityBy(activ)} 🔵`)
            }
            // avoiding rate-limit
            await new Promise((resolve) => {
              setTimeout(resolve, 2000)
            })
          }

          page++
        } else {
          if (retryCount < maxRetries) {
            retryCount++
            console.warn(
              `Empty activities returned. Retrying... (${retryCount}/${maxRetries})`
            )
            await new Promise((resolve) => setTimeout(resolve, 3000))
          } else {
            console.log(
              `\nProbably the end of activities after ${maxRetries} retries.`
            )
            console.info(activities)
            hasMoreActivities = false
          }
        }
      }
    } catch (error) {
      console.error(`\nError from likeFollowing. ${(error as Error).message}`)
    }
  }
  private static async Like(type: number) {
    try {
      let page = 1
      let hasMoreActivities = true
      let activity =
        type === 0
          ? followingActivitiesQuery
          : type === 1
            ? globalActivitiesQuery
            : followingActivitiesQuery

      while (hasMoreActivities) {
        const activities: {
          data?: {
            Page: {
              activities: TheActivity[]
            }
          }
          errors?: { message: string }[]
        } = await fetcher(activity, {
          page,
          perPage: 50,
        })

        if (activities && activities?.data?.Page?.activities.length > 0) {
          const activiti = activities?.data?.Page?.activities

          for (let activ of activiti) {
            if (!activ.isLiked && activ.id) {
              try {
                const like: { data?: { ToggleLike: { id: number } } } =
                  await fetcher(likeActivityMutation, {
                    activityId: activ.id,
                  })
                // const ToggleLike = like?.data?.ToggleLike
                console.info(`${activityBy(activ)} ${like?.data ? "✅" : "❌"}`)
              } catch (error) {
                console.error(
                  `Activity possibly deleted. ${(error as Error).message}`
                )
              }
            } else {
              console.log(`${activityBy(activ)} 🔵`)
            }
            // avoiding rate-limit
            await new Promise((resolve) => {
              setTimeout(resolve, 1500)
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

  private static async LikeSpecificUser() {
    try {
      const { username } = await inquirer.prompt([
        {
          type: "input",
          name: "username",
          message: "Username of the user:",
        },
      ])

      const userDetails: {
        data?: { User: { id: number } }
        errors?: { message: string }[]
      } = await fetcher(userQuery, { username: username })

      if (userDetails) {
        let page = 1
        const perPage = 50
        const userId = userDetails?.data?.User?.id

        if (userId) {
          while (true) {
            const activities: {
              data?: {
                Page: {
                  activities: TheActivity[]
                }
              }
              errors?: { message: string }[]
            } = await fetcher(specificUserActivitiesQuery, {
              page,
              perPage,
              userId,
            })
            const activiti = activities?.data?.Page?.activities

            // Break the loop if no more activities are found
            if (!activiti || activiti.length === 0) {
              console.log("No more activities found.")
              break
            }

            for (let activ of activiti) {
              if (!activ.isLiked && activ.id) {
                try {
                  const like: {
                    data?: { ToggleLike: { id: number } }
                  } = await fetcher(likeActivityMutation, {
                    activityId: activ.id,
                  })
                  console.info(
                    `${activityBy(activ)} ${like?.data ? "✅" : "❌"}`
                  )
                } catch (error) {
                  console.error(
                    `Activity possibly deleted. ${(error as Error).message}`
                  )
                }
              } else {
                console.log(`${activityBy(activ)} 🔵`)
              }

              // Avoiding rate limit
              await new Promise((resolve) => {
                setTimeout(resolve, 1500)
              })
            }

            // Go to the next page
            page += 1
          }
        }
      }
    } catch (error) {
      console.error(
        `\nError from LikeSpecificUser. ${(error as Error).message}`
      )
    }
  }

  static async LikeFollowingActivityV2(perPage: number) {
    try {
      let hasNextPage = true
      let page = 1
      let allFollowingUsers: User[] = []

      if (!(await Auth.isLoggedIn())) {
        console.error(`\nPlease login to use this feature.`)
        return
      }
      // Fetch all following users
      while (hasNextPage) {
        const followingUsers: UserFollowing = await fetcher(
          userFollowingQuery,
          {
            userId: await Auth.MyUserId(),
            page: page,
          }
        )
        console.log(followingUsers)

        allFollowingUsers.push(...followingUsers?.data?.Page?.following)

        if (followingUsers.data?.Page?.pageInfo.hasNextPage) {
          page++
        } else {
          hasNextPage = false
        }

        if (!followingUsers) {
          console.error(`\nFailed to fetch following users.`)
          hasNextPage = false
          return
        }
      }
      // Extract the IDs of all following users
      const followingUserIds: number[] = allFollowingUsers.map(
        (user) => user.id
      )
      // Calculations
      console.log(
        `\nTotal Following: ${followingUserIds.length}\nApproximately ${followingUserIds.length * 25} activities to like.\nWill take around ${Number((followingUserIds.length * 25) / 60).toFixed(2)} minutes.\n`
      )
      // Traverse the array and fetch users activities one by one and like them
      let userNumber = 0
      for (const userId of followingUserIds) {
        userNumber++
        console.log(`[${userNumber}]\t[User ID: ${userId}]`)
        let page = 1
        let hasNextPage = true
        while (hasNextPage) {
          const activities: {
            data?: {
              Page: {
                activities: TheActivity[]
              }
            }
            errors?: { message: string }[]
          } = await fetcher(specificUserActivitiesQuery, {
            page,
            perPage: perPage,
            userId,
          })

          if (activities && activities?.data?.Page?.activities.length > 0) {
            const activiti = activities?.data?.Page?.activities
            let activityCount = 0
            for (let activ of activiti) {
              activityCount++
              if (!activ.isLiked && activ.id) {
                try {
                  const like: {
                    data?: { ToggleLike: { id: number } }
                  } = await fetcher(likeActivityMutation, {
                    activityId: activ.id,
                  })
                  console.info(
                    `[${userNumber}/${activityCount}/${activiti.length}] ${activityBy(activ)} ${like?.data ? "✅" : "❌"}`
                  )
                } catch (error) {
                  console.error(
                    `[${userNumber}/${activityCount}/${activiti.length}] Activity possibly deleted. ${(error as Error).message}`
                  )
                }
              } else {
                console.log(
                  `[${userNumber}/${activityCount}/${activiti.length}] ${activityBy(activ)} 🔵`
                )
              }
              // avoiding rate-limit
              await new Promise((resolve) => {
                setTimeout(resolve, 1200)
              })
            }

            page++
          } else {
            // No more activities to like
            // console.log(`\nProbably the end of activities.`)
            // console.info(activities)
            hasNextPage = false
          }
        }
      }
    } catch (error) {
      console.warn(`\nError from LikeFollowingV2. ${(error as Error).message}`)
    }
  }

  static async AutoLike() {
    try {
      if (!(await Auth.isLoggedIn())) {
        console.error(`\nPlease login to use this feature.`)
        return
      }
      const { activityType }: { activityType: number } = await inquirer.prompt([
        {
          type: "list",
          name: "activityType",
          message: "Select activity type:",
          choices: [
            { name: "Following", value: 1 },
            { name: "Global", value: 2 },
            { name: "Specific User", value: 3 },
          ],
          pageSize: 10,
        },
      ])
      switch (activityType) {
        case 1:
          await this.LikeFollowing()
          break
        case 2:
          await this.Like(1)
          break
        case 3:
          await this.LikeSpecificUser()
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
