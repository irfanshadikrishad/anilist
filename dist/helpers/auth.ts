import { Cipher } from '@irfanshadikrishad/cipher'
import fs from 'fs'
import inquirer from 'inquirer'
import fetch from 'node-fetch'
import open from 'open'
import os from 'os'
import path from 'path'
import Spinner from 'tiny-spinner'
import { colorize } from '../lib/colorize.js'
import { fetcher } from './fetcher.js'
import { AniDB, AniList, MyAnimeList } from './lists.js'
import {
  deleteActivityMutation,
  deleteMangaEntryMutation,
  deleteMediaEntryMutation,
  saveTextActivityMutation,
  toggleFollowMutation,
} from './mutations.js'
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
  userActivityQuery,
  userFollowersQuery,
  userFollowingQuery,
} from './queries.js'
import { responsiveOutput } from './truncate.js'
import {
  DeleteMediaListResponse,
  MediaList,
  MediaListCollectionResponse,
  MediaTitle,
  Myself,
  SaveTextActivityResponse,
  ToggleFollowResponse,
  User,
  UserActivitiesResponse,
  UserFollower,
  UserFollowing,
} from './types.js'
import {
  aniListEndpoint,
  getTitle,
  redirectUri,
  timestampToTimeAgo,
} from './workers.js'

const home_dir = os.homedir()
const save_path = path.join(home_dir, '.anilist_tok3n')
const spinner = new Spinner()
const vigenere = new Cipher.Vigenere('anilist')

class Auth {
  /**
   * Get access-token from user
   */
  static async GetAccessToken(): Promise<string | null> {
    try {
      const { token }: { token: string } = await inquirer.prompt([
        {
          type: 'password',
          name: 'token',
          message: 'Please enter your AniList access token:',
        },
      ])
      if (!token) {
        console.warn('\nNo token entered. Please try again.')
        return null
      }
      return token
    } catch (error) {
      console.error(
        `\nAn error occurred while getting the access token: ${(error as Error).message}`
      )
      return null
    }
  }
  static async StoreAccessToken(token: string): Promise<void> {
    try {
      if (!token) {
        console.warn('\nNo token provided. Nothing to store.')
        return
      }
      fs.writeFileSync(save_path, vigenere.encrypt(token), { encoding: 'utf8' })
    } catch (error) {
      console.error(`\nError storing access token: ${(error as Error).message}`)
    }
  }
  static async RetriveAccessToken(): Promise<string | null> {
    try {
      if (fs.existsSync(save_path)) {
        return vigenere.decrypt(
          fs.readFileSync(save_path, { encoding: 'utf8' })
        )
      } else {
        return null
      }
    } catch (error) {
      console.error(
        `\nError retriving acess-token. ${(error as Error).message}`
      )
      return null
    }
  }
  static async Login(clientId: number, clientSecret: string) {
    try {
      console.log('Starting AniList login...')
      const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`
      console.log('Opening browser for AniList login...')
      open(authUrl)

      const authCode: string = await Auth.GetAccessToken()

      const tokenResponse = await fetch(
        'https://anilist.co/api/v2/oauth/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
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
        console.error('\nFailed to get access token:', token_Data)
      }
    } catch (error) {
      console.error(`\nFailed logging in. ${(error as Error).message}`)
    }
  }
  static async Myself() {
    try {
      if (await Auth.isLoggedIn()) {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await Auth.RetriveAccessToken()}`,
        }
        const request = await fetch(aniListEndpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ query: currentUserQuery }),
        })
        const { data, errors }: Myself = await request.json()

        if (request.status === 200) {
          const user = data?.Viewer
          const activiResponse: UserActivitiesResponse = await fetcher(
            userActivityQuery,
            {
              id: user?.id,
              page: 1,
              perPage: 10,
            }
          )
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
              responsiveOutput(
                `${timestampToTimeAgo(createdAt)}\t${status} ${progress ? `${progress} of ` : ''}${getTitle(
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
  static async isLoggedIn(): Promise<boolean> {
    try {
      const token = await Auth.RetriveAccessToken()
      return token !== null
    } catch (error) {
      console.error(`Error checking login status: ${(error as Error).message}`)
      return false
    }
  }
  static async Logout(): Promise<void> {
    try {
      const username = await Auth.MyUserName()

      if (fs.existsSync(save_path)) {
        try {
          fs.unlinkSync(save_path)
          console.log(`\nLogout successful. See you soon, ${username}.`)
        } catch (error) {
          console.error(
            '\nFailed to remove the save file during logout:',
            (error as Error).message
          )
        }
      } else {
        console.warn(
          '\nNo active session found. You may already be logged out.'
        )
      }
    } catch (error) {
      console.error(
        `\nAn error occurred during logout: ${(error as Error).message}`
      )
    }
  }
  static async MyUserId() {
    if (!(await Auth.isLoggedIn())) {
      console.warn(`\nUser not logged in.`)
      return null
    }

    const { data }: Myself = await fetcher(currentUserQuery, {})

    return data?.Viewer?.id ?? null
  }
  static async MyUserName() {
    if (!(await Auth.isLoggedIn())) {
      console.log(`\nUser not logged in.`)
      return null
    }

    const { data }: Myself = await fetcher(currentUserQuery, {})

    return data?.Viewer?.name ?? null
  }
  static async DeleteMyActivities() {
    try {
      if (!(await Auth.isLoggedIn())) {
        console.error(`\nPlease log in to delete your activities.`)
        return
      }
      const { activityType }: { activityType: number } = await inquirer.prompt([
        {
          type: 'list',
          name: 'activityType',
          message: 'What type of activity you want to delete?',
          choices: [
            { name: 'All Activity', value: 0 },
            { name: 'Text Activity', value: 1 },
            { name: 'Media List Activity', value: 2 },
            { name: 'Anime List Activity', value: 3 },
            { name: 'Manga List Activity', value: 4 },
            { name: 'Message Activity', value: 5 },
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
        const response: UserActivitiesResponse = await fetcher(query, {
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
              if (act?.id) {
                const deleteResponse: {
                  data?: { DeleteActivity: { deleted: boolean } }
                  errors?: { message: string }[]
                } = await fetcher(deleteActivityMutation, {
                  id: act?.id,
                })
                const isDeleted = deleteResponse?.data?.DeleteActivity?.deleted
                count++
                totalCount++

                console.log(
                  `[${count}/${activities.length}/${totalCount}]\t${act?.id} ${
                    isDeleted ? '✔' : '✘'
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
    } catch (error) {
      console.error(`\nSomething went wrong. ${(error as Error).message}`)
    }
  }
  static async DeleteMyAnimeList() {
    if (!(await Auth.isLoggedIn())) {
      console.error(`\nPlease log in first to delete your lists.`)
      return
    }
    if (!(await Auth.MyUserId())) {
      console.log(`\nFailed getting current user Id.`)
      return
    }
    const response: MediaListCollectionResponse = await fetcher(
      currentUserAnimeList,
      { id: await Auth.MyUserId() }
    )

    if (response !== null) {
      const lists: MediaList[] = response?.data?.MediaListCollection?.lists

      if (lists.length > 0) {
        const { selectedList }: { selectedList: string } =
          await inquirer.prompt([
            {
              type: 'select',
              name: 'selectedList',
              message: 'Select an anime list:',
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
          console.log('No entries found.')
        }
      } else {
        console.log(`\nNo anime(s) found in any list.`)
      }
    } else {
      console.log(`\nSomething went wrong. ${response?.errors[0]?.message}`)
    }
  }
  static async DeleteAnimeById(id: number, title?: MediaTitle) {
    try {
      const response: DeleteMediaListResponse = await fetcher(
        deleteMediaEntryMutation,
        { id: id }
      )

      if (response?.data) {
        const deleted = response?.data?.DeleteMediaListEntry?.deleted
        console.log(
          `del ${title ? getTitle(title) : ''} ${deleted ? '✔' : '✘'}`
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
      if (!(await Auth.isLoggedIn())) {
        console.error(`\nPlease log in first to delete your lists.`)
        return
      }
      if (!(await Auth.MyUserId())) {
        console.error(`\nFailed getting current user Id.`)
        return
      }
      const response: MediaListCollectionResponse = await fetcher(
        currentUserMangaList,
        { id: await Auth.MyUserId() }
      )
      if (!response?.data) {
        console.error(`\nSomething went wrong. ${response?.errors[0]?.message}`)
        return
      }
      const lists: MediaList[] = response?.data?.MediaListCollection?.lists
      if (lists.length > 0) {
        const { selectedList }: { selectedList: string } =
          await inquirer.prompt([
            {
              type: 'select',
              name: 'selectedList',
              message: 'Select a manga list:',
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
          console.error('\nNo entries found.')
        }
      } else {
        console.error(`\nNo manga(s) found in any list.`)
      }
    } catch (error) {
      console.error(`\nError deleting manga. ${(error as Error).message}`)
    }
  }
  static async DeleteMangaById(id: number, title?: MediaTitle) {
    try {
      const response: DeleteMediaListResponse = await fetcher(
        deleteMangaEntryMutation,
        { id }
      )

      const statusMessage: string = title ? getTitle(title) : ''

      if (response?.data) {
        const deleted: boolean = response?.data?.DeleteMediaListEntry?.deleted
        console.log(`del ${statusMessage} ${deleted ? '✔' : '✘'}`)
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

      const { data }: SaveTextActivityResponse = await fetcher(
        saveTextActivityMutation,
        {
          status: status,
        }
      )

      if (!data) {
        console.error(`\nSomething went wrong. ${data}.`)
        return
      }

      if (data.SaveTextActivity.id) {
        console.log(
          `\n[${data.SaveTextActivity.id}] status saved successfully!`
        )
      }
    } catch (error) {
      console.error(`\n${(error as Error).message}`)
    }
  }
  static async callAnimeImporter() {
    try {
      const { source }: { source: number } = await inquirer.prompt([
        {
          type: 'select',
          name: 'source',
          message: 'Select a source:',
          choices: [
            { name: 'Exported JSON file.', value: 1 },
            { name: 'MyAnimeList (XML)', value: 2 },
            { name: 'AniDB (json-large)', value: 3 },
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
          type: 'select',
          name: 'source',
          message: 'Select a source:',
          choices: [
            { name: 'Exported JSON file.', value: 1 },
            { name: 'MyAnimeList (XML)', value: 2 },
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
}

class Social {
  /**
   * Follow the users that follows you
   */
  static async follow() {
    try {
      let pager = 1
      let hasNextPage = true
      const allFollowerUsers: User[] = []
      let followedBack = 0
      spinner.start('Fetching all the followers...')
      while (hasNextPage) {
        const followerUsers: UserFollower = await fetcher(userFollowersQuery, {
          userId: await Auth.MyUserId(),
          page: pager,
        })
        spinner.update(
          `Fetched page ${pager} of ${followerUsers?.data?.Page?.pageInfo?.lastPage}...`
        )
        if (!followerUsers?.data?.Page?.pageInfo?.hasNextPage) {
          hasNextPage = false
        }
        allFollowerUsers.push(...(followerUsers?.data?.Page?.followers || []))
        pager++
      }
      spinner.stop('Fetched all the followers. Starting follow back.')
      // Filter users that do no follow me
      const notFollowing: { id: number; name: string }[] = allFollowerUsers
        .filter(({ isFollowing }) => !isFollowing)
        .map(({ id, name }) => ({ id: id, name: name }))

      console.log(
        `\nTotal follower ${allFollowerUsers.length}.\nNot followed back ${notFollowing.length}\n`
      )
      if (notFollowing.length <= 0) {
        console.log(`Probably followed back all the users.`)
        return
      }
      // Traverse and follow back
      const maxIdLength = Math.max(
        ...notFollowing.map(({ id }) => String(id).length)
      )
      const maxNameLength = Math.max(
        ...notFollowing.map(({ name }) => name.length)
      )

      for (const nf of notFollowing) {
        try {
          const follow: ToggleFollowResponse = await fetcher(
            toggleFollowMutation,
            { userId: nf.id }
          )
          console.log(
            `${String(`[${nf.id}]`).padEnd(maxIdLength)}` +
              `\t${String(`[${follow?.data?.ToggleFollow?.name}]`).padEnd(maxNameLength)}` +
              `\t${follow?.data?.ToggleFollow?.id ? colorize.Green('✔') : colorize.Red('✘')}`
          )
          // Count the followed back users
          if (follow?.data?.ToggleFollow?.id) {
            followedBack++
          }
        } catch (error) {
          console.log(
            `automate_follow_toggle_follow: ${(error as Error).message}`
          )
        }
      }
      console.log(
        `\n${colorize.Green('✔')} Followed back ${followedBack} users.`
      )
    } catch (error) {
      console.log(`\nautomate_follow ${(error as Error).message}`)
    }
  }
  /**
   * Unfollow the users thats not following you
   */
  static async unfollow() {
    try {
      let pager = 1
      let hasNextPage = true
      const allFollowingUsers: User[] = []
      let unfollowedUsers = 0
      spinner.start('Fetching all following users...')
      while (hasNextPage) {
        const followingUsers: UserFollowing = await fetcher(
          userFollowingQuery,
          {
            userId: await Auth.MyUserId(),
            page: pager,
          }
        )
        spinner.update(
          `Fetched page ${pager} of ${followingUsers?.data?.Page?.pageInfo?.lastPage}...`
        )
        if (!followingUsers?.data?.Page?.pageInfo?.hasNextPage) {
          hasNextPage = false
        }
        allFollowingUsers.push(...(followingUsers?.data?.Page?.following || []))
        pager++
      }
      spinner.update(
        `${colorize.Green('✔')} Fetching complete. Total got ${allFollowingUsers.length} users.`
      )
      // Filter users that do no follow me
      const notFollowingMe: { id: number; name: string }[] = allFollowingUsers
        .filter((user) => !user.isFollower)
        .map((u3r) => ({ id: u3r.id, name: u3r.name }))
      if (notFollowingMe.length <= 0) {
        spinner.stop(`No users to unfollow. Exiting operation...`)
        return
      }
      spinner.stop(
        `Unfollow process activated with ${notFollowingMe.length} users.`
      )
      let nfmCount = 0
      console.log(`\n`)
      for (const nfm of notFollowingMe) {
        nfmCount++
        try {
          const unfollow: ToggleFollowResponse = await fetcher(
            toggleFollowMutation,
            {
              userId: nfm.id,
            }
          )
          console.log(
            `[${nfm.id}]\t[${unfollow?.data?.ToggleFollow?.name}]\t${unfollow?.data?.ToggleFollow?.id ? colorize.Green('✔') : colorize.Red('✘')}`
          )
          // Count the unfollowed users
          if (unfollow?.data?.ToggleFollow?.id) {
            unfollowedUsers++
          }
        } catch (error) {
          console.log(`unfollow_toggle_follow. ${(error as Error).message}`)
        }
      }
      console.log(
        `\nTotal Unfollowed: ${unfollowedUsers} of ${nfmCount} users.`
      )
    } catch (error) {
      console.error(`\nautomate_unfollow: ${(error as Error).message}`)
    }
  }
}

export { Auth, Social }
