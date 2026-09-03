import { Cipher } from '@irfanshadikrishad/cipher'
import fs from 'fs'
import inquirer from 'inquirer'
import fetch from 'node-fetch'
import open from 'open'
import os from 'os'
import path from 'path'
import { exit } from 'process'
import Spinner from 'tiny-spinner'
import { fetcher } from './fetcher.js'
import { colorize } from './lib/colorize.js'
import { AniDB, AniList, MyAnimeList } from './lists.js'
import {
	deleteActivityMutation,
	deleteMangaEntryMutation,
	deleteMediaEntryMutation,
	likeActivityMutation,
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
	followingActivitiesQuery,
	globalActivitiesQuery,
	specificUserActivitiesQuery,
	userActivityQuery,
	userFollowersQuery,
	userFollowingQuery,
	userQuery,
} from './queries.js'
import { responsiveOutput } from './truncate.js'
import {
	DeleteMediaListResponse,
	LikeActivityResponse,
	MediaList,
	MediaListCollectionResponse,
	MediaTitle,
	Myself,
	SaveTextActivityResponse,
	SpecificUserActivitiesResponse,
	TheActivity,
	ToggleFollowResponse,
	User,
	UserActivitiesResponse,
	UserFollower,
	UserFollowing,
} from './types.js'
import {
	activityBy,
	aniListEndpoint,
	getTitle,
	redirectUri,
	sleep,
	timestampToTimeAgo,
} from './workers.js'

const home_dir = os.homedir()
const save_path = path.join(home_dir, '.anilist_token')
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
										isDeleted ? colorize.Green('✔') : colorize.Red('✘')
									}`
								)

								// Avoiding rate-limit
								await sleep(1100)
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
	private static async DeleteMediaEntryById(
		mutation: string,
		id: number,
		title?: MediaTitle
	) {
		try {
			const response: DeleteMediaListResponse = await fetcher(mutation, { id })

			if (response?.data) {
				const deleted = response?.data?.DeleteMediaListEntry?.deleted
				console.log(
					`del ${title ? getTitle(title) : ''} ${deleted ? colorize.Green('✔') : colorize.Red('✘')}`
				)
			} else {
				console.error(
					`\nError deleting entry. ${response?.errors?.[0]?.message}`
				)
			}
		} catch (error) {
			console.error(`\nError deleting entry. ${id} ${(error as Error).message}`)
		}
	}
	static async DeleteAnimeById(id: number, title?: MediaTitle) {
		return Auth.DeleteMediaEntryById(deleteMediaEntryMutation, id, title)
	}
	static async DeleteMangaById(id: number, title?: MediaTitle) {
		return Auth.DeleteMediaEntryById(deleteMangaEntryMutation, id, title)
	}
	private static async DeleteMyMediaList(
		listQuery: string,
		deleteByIdFn: (id: number, title?: MediaTitle) => Promise<void>,
		mediaLabel: 'anime' | 'manga'
	) {
		try {
			if (!(await Auth.isLoggedIn())) {
				console.error(`\nPlease log in first to delete your lists.`)
				return
			}
			if (!(await Auth.MyUserId())) {
				console.error(`\nFailed getting current user Id.`)
				return
			}
			const response: MediaListCollectionResponse = await fetcher(listQuery, {
				id: await Auth.MyUserId(),
			})
			if (!response?.data) {
				console.error(
					`\nSomething went wrong. ${response?.errors?.[0]?.message}`
				)
				return
			}
			const lists: MediaList[] = response?.data?.MediaListCollection?.lists
			if (!lists || lists.length === 0) {
				console.error(`\nNo ${mediaLabel}(s) found in any list.`)
				return
			}
			const { selectedList }: { selectedList: string } = await inquirer.prompt([
				{
					type: 'list',
					name: 'selectedList',
					message: `Select a${mediaLabel === 'anime' ? 'n' : ''} ${mediaLabel} list:`,
					choices: lists.map((list: MediaList) => list.name),
					pageSize: 10,
				},
			])
			const selectedEntries: MediaList = lists.find(
				(list: MediaList) => list.name === selectedList
			)
			if (!selectedEntries) {
				console.error('\nNo entries found.')
				return
			}
			console.log(`\nDeleting entries of '${selectedEntries.name}':`)
			for (const [, entry] of selectedEntries.entries.entries()) {
				if (entry?.id) {
					await deleteByIdFn(entry?.id, entry?.media?.title)
					await sleep(1100)
				} else {
					console.log(`No id in entry.`)
					console.log(entry)
				}
			}
		} catch (error) {
			console.error(
				`\nError deleting ${mediaLabel}. ${(error as Error).message}`
			)
		}
	}
	static async DeleteMyAnimeList() {
		return Auth.DeleteMyMediaList(
			currentUserAnimeList,
			Auth.DeleteAnimeById,
			'anime'
		)
	}
	static async DeleteMyMangaList() {
		return Auth.DeleteMyMediaList(
			currentUserMangaList,
			Auth.DeleteMangaById,
			'manga'
		)
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
					type: 'list',
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
					type: 'list',
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
	/**
	 * Attempt to like a single activity, respecting activities that are already liked.
	 * Printing/counting is left to the caller since labeling conventions differ per flow.
	 */
	private static async attemptLikeActivity(
		activ: TheActivity
	): Promise<'liked' | 'failed' | 'skipped' | 'error'> {
		if (activ.isLiked || !activ.id) {
			return 'skipped'
		}
		try {
			const like: LikeActivityResponse = await fetcher(likeActivityMutation, {
				activityId: activ.id,
			})
			return like?.data ? 'liked' : 'failed'
		} catch (error) {
			console.error(`Activity possibly deleted. ${(error as Error).message}`)
			return 'error'
		}
	}
	private static async LikeFollowing() {
		try {
			let page: number = 1
			let hasMoreActivities: boolean = true
			let retryCount: number = 0
			const maxRetries: number = 5
			let likedCount = 0

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
					spinner.success(
						`Got ${activities?.data?.Page?.activities.length} activities..`
					)
					retryCount = 0 // Reset retry count on successful fetch
					const activiti = activities?.data?.Page?.activities

					for (let activ of activiti) {
						const result = await Auth.attemptLikeActivity(activ)
						if (result === 'liked') {
							likedCount++
						}
						if (result === 'liked' || result === 'failed') {
							responsiveOutput(
								`${result === 'liked' ? colorize.Green('✔') : colorize.Red('✘')} ${activityBy(activ, likedCount)}`
							)
						} else if (result === 'skipped') {
							responsiveOutput(
								`${colorize.Yellow('⚉')} ${activityBy(activ, likedCount)}`
							)
						}
						// avoiding rate-limit
						await sleep(2000)
					}

					page++
				} else {
					if (retryCount < maxRetries) {
						spinner.start('Getting activities...')
						retryCount++
						spinner.update(
							`Empty activities returned. Retrying... (${retryCount}/${maxRetries})`
						)
						await sleep(2000)
					} else {
						spinner.error(
							`Probably the end of activities after ${maxRetries} retries.`
						)
						hasMoreActivities = false
					}
				}
			}
		} catch (error) {
			console.error(`\nError from likeFollowing. ${(error as Error).message}`)
		}
	}
	private static async LikeGlobal() {
		try {
			let page = 1
			let hasMoreActivities = true
			let likedCount = 0

			spinner.start(`Getting global activities...`)

			while (hasMoreActivities) {
				const activities: {
					data?: {
						Page: {
							activities: TheActivity[]
						}
					}
					errors?: { message: string }[]
				} = await fetcher(globalActivitiesQuery, {
					page,
					perPage: 50,
				})

				if (activities && activities?.data?.Page?.activities.length > 0) {
					const activiti = activities?.data?.Page?.activities
					spinner.success(`Got ${activiti.length} activities...`)

					for (let activ of activiti) {
						const result = await Auth.attemptLikeActivity(activ)
						if (result === 'liked' || result === 'failed') {
							likedCount++
							responsiveOutput(
								`${result === 'liked' ? colorize.Green('✔') : colorize.Red('✘')} ${activityBy(activ, likedCount)}`
							)
						} else if (result === 'skipped') {
							responsiveOutput(
								`${colorize.Yellow('⚉')} ${activityBy(activ, likedCount)}`
							)
						}
						// avoiding rate-limit
						await sleep(1500)
					}

					page++
				} else {
					// No more activities to like
					spinner.error(
						`Probably the end of activities. ${activities?.data?.Page?.activities}`
					)
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
					type: 'input',
					name: 'username',
					message: 'Username of the user:',
				},
			])

			const { toLikeAmount } = await inquirer.prompt([
				{
					type: 'number',
					name: 'toLikeAmount',
					message: 'Likes to give:',
				},
			])

			const userDetails: {
				data?: { User: { id: number } }
				errors?: { message: string }[]
			} = await fetcher(userQuery, { username: username })

			spinner.start(`Getting activities by ${username}`)

			if (userDetails?.data?.User?.id) {
				let page = 1
				const perPage = 50
				const userId = userDetails.data.User.id
				let likedCount = 0

				while (likedCount < toLikeAmount) {
					const activities: SpecificUserActivitiesResponse = await fetcher(
						specificUserActivitiesQuery,
						{
							page,
							perPage,
							userId,
						}
					)
					const activiti = activities?.data?.Page?.activities

					if (!activiti || activiti.length === 0) {
						spinner.error('No more activities found.')
						break
					}

					spinner.success(`Got ${activiti.length} activities...`)

					for (let activ of activiti) {
						const result = await Auth.attemptLikeActivity(activ)
						if (result === 'liked' || result === 'failed') {
							likedCount++
							responsiveOutput(
								`${result === 'liked' ? colorize.Green('✔') : colorize.Red('✘')} ${activityBy(activ, likedCount)}`
							)

							if (likedCount >= toLikeAmount) {
								spinner.success(
									`Finished liking ${likedCount} activities of ${username}.`
								)
								return
							}
						} else if (result === 'skipped') {
							responsiveOutput(
								`${colorize.Yellow('⚉')} ${activityBy(activ, likedCount)}`
							)
						}
					}
					page += 1
				}
			} else {
				spinner.error(`User ${username} does not exist.`)
				exit(1)
			}
		} catch (error) {
			console.error(
				`\nError from LikeSpecificUser. ${(error as Error).message}`
			)
		}
	}

	static async LikeFollowingActivityV2(perPage: number) {
		try {
			if (!(await Auth.isLoggedIn())) {
				console.error(`\nPlease log in to use this feature.`)
				return
			}

			const allFollowingUsers: User[] = []
			let hasNextPage = true
			let page = 1
			let liked = 0

			// ------------------------
			// Fetch all following users
			// ------------------------
			spinner.start(`Gathering following information...`)
			while (hasNextPage) {
				spinner.update(`Fetched page ${page}...`)
				const followingUsers: UserFollowing = await fetcher(
					userFollowingQuery,
					{
						userId: await Auth.MyUserId(),
						page,
					}
				)

				if (!followingUsers?.data?.Page?.following) {
					console.error(`\nFailed to fetch following users.`)
					return
				}

				allFollowingUsers.push(...followingUsers.data.Page.following)
				hasNextPage = followingUsers.data.Page.pageInfo.hasNextPage
				page++
			}
			spinner.stop(`Got ${allFollowingUsers.length} following user.`)

			// Extract the IDs of all following users
			const followingUserIds: number[] = allFollowingUsers.map(
				(user) => user.id
			)
			// --------------------
			// APPROXIMATE TIME
			// --------------------
			const totalActivities: number = followingUserIds.length * perPage
			const perActivityTimeInSec = 1
			const rateLimitTimeInSec = 60
			const batchSize = 29

			const batches = Math.floor(totalActivities / batchSize)
			const remaining = totalActivities % batchSize
			const processingTime =
				batches * batchSize * perActivityTimeInSec +
				remaining * perActivityTimeInSec
			const waitTime = (batches - 1) * rateLimitTimeInSec
			const totalWaitTimeInSec = processingTime + (batches > 0 ? waitTime : 0)

			const hours = Math.floor(totalWaitTimeInSec / 3600)
			const minutes = Math.floor((totalWaitTimeInSec % 3600) / 60)
			const seconds = totalWaitTimeInSec % 60

			const time = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`

			console.log(
				`\nTotal following: ${followingUserIds.length}\nApproximately ${totalActivities} to like.\nWill take around ${time}`
			)

			// -------------------
			// Traverse the array and
			// fetch users' activities one by one
			// -------------------
			let userNumber = 0
			for (const userId of followingUserIds) {
				userNumber++
				console.log(`\n[${userNumber}]\tID: ${userId}`)

				// Fetch `perPage` activities for the current user
				const activities: SpecificUserActivitiesResponse = await fetcher(
					specificUserActivitiesQuery,
					{
						userId,
						page: 1, // Always fetch from the first page
						perPage,
					}
				)

				if (!activities?.data?.Page?.activities?.length) {
					console.log(
						`[${userNumber}] No activities found for User ID: ${userId}`
					)
					continue
				}

				const activiti = activities.data.Page.activities

				for (let i = 0; i < activiti.length; i++) {
					const activ = activiti[i]
					const result = await Auth.attemptLikeActivity(activ)
					if (result === 'liked' || result === 'failed') {
						responsiveOutput(
							`${result === 'liked' ? colorize.Green('✔') : colorize.Red('✘')} ${activityBy(activ, i + 1)}`
						)
						if (result === 'liked') {
							liked++
						}
					} else if (result === 'skipped') {
						responsiveOutput(
							`${colorize.Yellow('⚉')} ${activityBy(activ, i + 1)}`
						)
					}

					// Avoid rate-limiting
					await sleep(1200)
				}
			}
			console.log(
				`\n${colorize.Green('✔')} All ${liked} activities liked successfully.`
			)
		} catch (error) {
			console.error(
				`\nError in LikeFollowingActivityV2: ${(error as Error).message}`
			)
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
					type: 'list',
					name: 'activityType',
					message: 'Select activity type:',
					choices: [
						{ name: 'Following • v1', value: 1 },
						{ name: 'Following • v2', value: 2 },
						{ name: 'Global', value: 3 },
						{ name: 'Specific User', value: 4 },
					],
					pageSize: 10,
				},
			])
			switch (activityType) {
				case 1:
					await this.LikeFollowing()
					break
				case 2: {
					const { count } = await inquirer.prompt([
						{
							type: 'number',
							name: 'count',
							message: 'Likes to give:',
						},
					])
					await this.LikeFollowingActivityV2(count)
					break
				}
				case 3:
					await this.LikeGlobal()
					break
				case 4:
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

class Social {
	/**
	 * Fetch every page of a followers/following listing for the current user.
	 */
	private static async fetchAllUsers(
		query: string,
		extractPage: (response: UserFollower | UserFollowing) => {
			list: User[]
			hasNextPage: boolean
			lastPage: number
		}
	): Promise<User[]> {
		let pager = 1
		let hasNextPage = true
		const allUsers: User[] = []
		const userId = await Auth.MyUserId()
		while (hasNextPage) {
			const response: UserFollower | UserFollowing = await fetcher(query, {
				userId,
				page: pager,
			})
			const page = extractPage(response)
			spinner.update(`Fetched page ${pager} of ${page.lastPage}...`)
			allUsers.push(...page.list)
			hasNextPage = page.hasNextPage
			pager++
		}
		return allUsers
	}
	/**
	 * Toggle-follow a batch of users, logging the outcome of each.
	 */
	private static async toggleFollowBatch(
		users: { id: number; name: string }[]
	): Promise<number> {
		let toggled = 0
		const maxIdLength = Math.max(...users.map(({ id }) => String(id).length))
		const maxNameLength = Math.max(...users.map(({ name }) => name.length))

		for (const user of users) {
			try {
				const response: ToggleFollowResponse = await fetcher(
					toggleFollowMutation,
					{ userId: user.id }
				)
				console.log(
					`${String(`[${user.id}]`).padEnd(maxIdLength)}\t${String(
						`[${response?.data?.ToggleFollow?.name}]`
					).padEnd(
						maxNameLength
					)}\t${response?.data?.ToggleFollow?.id ? colorize.Green('✔') : colorize.Red('✘')}`
				)
				if (response?.data?.ToggleFollow?.id) {
					toggled++
				}
			} catch (error) {
				console.log(`toggle_follow: ${(error as Error).message}`)
			}
		}
		return toggled
	}
	/**
	 * Follow the users that follows you
	 */
	static async follow() {
		try {
			spinner.start('Fetching all the followers...')
			const allFollowerUsers = await Social.fetchAllUsers(
				userFollowersQuery,
				(response: UserFollower) => ({
					list: response?.data?.Page?.followers || [],
					hasNextPage: response?.data?.Page?.pageInfo?.hasNextPage ?? false,
					lastPage: response?.data?.Page?.pageInfo?.lastPage,
				})
			)
			spinner.stop('Fetched all the followers. Starting follow back.')
			// Filter users that do no follow me
			const notFollowing: { id: number; name: string }[] = allFollowerUsers
				.filter(({ isFollowing }) => !isFollowing)
				.map(({ id, name }) => ({ id, name }))

			console.log(
				`\nTotal follower ${allFollowerUsers.length}.\nNot followed back ${notFollowing.length}\n`
			)
			if (notFollowing.length <= 0) {
				console.log(`Probably followed back all the users.`)
				return
			}
			const followedBack = await Social.toggleFollowBatch(notFollowing)
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
			spinner.start('Fetching all following users...')
			const allFollowingUsers = await Social.fetchAllUsers(
				userFollowingQuery,
				(response: UserFollowing) => ({
					list: response?.data?.Page?.following || [],
					hasNextPage: response?.data?.Page?.pageInfo?.hasNextPage ?? false,
					lastPage: response?.data?.Page?.pageInfo?.lastPage,
				})
			)
			spinner.update(
				`Fetching complete. Total got ${allFollowingUsers.length} users.`
			)
			// Filter users that do no follow me
			const notFollowingMe: { id: number; name: string }[] = allFollowingUsers
				.filter((user) => !user.isFollower)
				.map(({ id, name }) => ({ id, name }))
			if (notFollowingMe.length <= 0) {
				spinner.stop(`No users to unfollow. Exiting operation...`)
				return
			}
			spinner.stop(
				`Unfollow process activated with ${notFollowingMe.length} users.`
			)
			console.log(`\n`)
			const unfollowedUsers = await Social.toggleFollowBatch(notFollowingMe)
			console.log(
				`\n${colorize.Green('✔')} Total Unfollowed: ${unfollowedUsers} of ${notFollowingMe.length} users.`
			)
		} catch (error) {
			console.error(`\nautomate_unfollow: ${(error as Error).message}`)
		}
	}
	/**
	 * Unfollow the users you follow who haven't posted any activity in the
	 * given number of months, to help clear out stale/inactive accounts.
	 */
	static async unfollowInactive(months: number) {
		try {
			if (!Number.isFinite(months) || months <= 0) {
				console.error(`\nMust provide a positive number of months.`)
				return
			}

			spinner.start('Fetching all following users...')
			const allFollowingUsers = await Social.fetchAllUsers(
				userFollowingQuery,
				(response: UserFollowing) => ({
					list: response?.data?.Page?.following || [],
					hasNextPage: response?.data?.Page?.pageInfo?.hasNextPage ?? false,
					lastPage: response?.data?.Page?.pageInfo?.lastPage,
				})
			)
			spinner.stop(
				`Fetched ${allFollowingUsers.length} following user(s). Checking their last activity...`
			)

			const inactivityWindow = months * 30 * 24 * 60 * 60
			const cutoff = Math.floor(Date.now() / 1000) - inactivityWindow
			// Users active within this many seconds *after* the cutoff are "almost"
			// stale (within 20% of the inactivity window) and get a soft warning.
			const nearCutoff = cutoff + inactivityWindow * 0.2
			const staleUsers: { id: number; name: string }[] = []

			// Fixed-width columns so rows line up regardless of name/index length
			const maxIndexLength =
				`[${allFollowingUsers.length}/${allFollowingUsers.length}]`.length
			const maxNameLength = Math.max(
				...allFollowingUsers.map(({ name }) => name.length)
			)

			let checked = 0
			for (const user of allFollowingUsers) {
				checked++
				const activityResponse: SpecificUserActivitiesResponse = await fetcher(
					specificUserActivitiesQuery,
					{ userId: user.id, page: 1, perPage: 1 }
				)
				const lastActiveAt =
					activityResponse?.data?.Page?.activities?.[0]?.createdAt
				const isStale = !lastActiveAt || lastActiveAt < cutoff
				const isNearStale = !isStale && lastActiveAt < nearCutoff
				const activityLabel = lastActiveAt
					? timestampToTimeAgo(lastActiveAt)
					: 'no activity found'
				const coloredActivityLabel = isStale
					? colorize.Red(activityLabel)
					: isNearStale
						? colorize.Yellow(activityLabel)
						: activityLabel

				responsiveOutput(
					`${`[${checked}/${allFollowingUsers.length}]`.padEnd(
						maxIndexLength
					)}\t${user.name.padEnd(maxNameLength)}\t${coloredActivityLabel}`
				)

				if (isStale) {
					staleUsers.push({ id: user.id, name: user.name })
				}

				// avoiding rate-limit
				await sleep(1100)
			}

			console.log(
				`\nFound ${staleUsers.length} user(s) inactive for ${months}+ month(s).`
			)
			if (staleUsers.length <= 0) {
				console.log(`No stale accounts to unfollow.`)
				return
			}

			const unfollowedUsers = await Social.toggleFollowBatch(staleUsers)
			console.log(
				`\n${colorize.Green('✔')} Unfollowed ${unfollowedUsers} of ${staleUsers.length} inactive user(s).`
			)
		} catch (error) {
			console.error(`\nautomate_unfollow_inactive: ${(error as Error).message}`)
		}
	}
}

export { Auth, Social }
