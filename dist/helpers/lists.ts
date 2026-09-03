import { XMLParser } from 'fast-xml-parser'
import { readFile } from 'fs/promises'
import inquirer from 'inquirer'
import { jsonrepair } from 'jsonrepair'
import { join } from 'path'
import { Auth } from './auth.js'
import { fetcher } from './fetcher.js'
import {
	addAnimeToListMutation,
	addMangaToListMutation,
	saveAnimeWithProgressMutation,
	saveMangaWithProgressMutation,
} from './mutations.js'
import {
	animeDetailsQuery,
	animeSearchQuery,
	currentUserAnimeList,
	currentUserMangaList,
	malIdToAnilistAnimeId,
	malIdToAnilistMangaId,
	mangaDetailsQuery,
	mangaSearchQuery,
	popularQuery,
	trendingQuery,
	upcomingAnimesQuery,
	userActivityQuery,
	userFollowersQuery,
	userFollowingQuery,
	userQuery,
} from './queries.js'
import { responsiveOutput } from './truncate.js'
import {
	AniListMediaStatus,
	AnimeDetails,
	AnimeList,
	MalIdToAnilistIdResponse,
	MangaDetails,
	MediaEntry,
	MediaList,
	MediaListCollectionResponse,
	MediaListEntry,
	MediaTitle,
	MediaWithProgress,
	saveAnimeWithProgressResponse,
	SaveMediaListEntryResponse,
	UserActivitiesResponse,
	UserFollower,
	UserFollowing,
	UserResponse,
} from './types.js'
import { Validate } from './validation.js'
import {
	anidbToanilistMapper,
	formatDateObject,
	getDownloadFolderPath,
	getNextSeasonAndYear,
	getTitle,
	logUserDetails,
	removeHtmlAndMarkdown,
	saveJSONasCSV,
	saveJSONasJSON,
	saveJSONasXML,
	selectFile,
	simpleDateFormat,
	timestampToTimeAgo,
} from './workers.js'

class AniList {
	/**
	 * Prompt the user for a list status (Planning/Watching-Reading/Completed/Paused/Dropped)
	 */
	private static async promptListType(
		kind: 'ANIME' | 'MANGA'
	): Promise<string> {
		const label = kind === 'ANIME' ? 'anime' : 'manga'
		const { selectedListType }: { selectedListType: string } =
			await inquirer.prompt([
				{
					type: 'list',
					name: 'selectedListType',
					message: `Select the list where you want to save this ${label}:`,
					choices: [
						{ name: 'Planning', value: 'PLANNING' },
						{
							name: kind === 'ANIME' ? 'Watching' : 'Reading',
							value: 'CURRENT',
						},
						{ name: 'Completed', value: 'COMPLETED' },
						{ name: 'Paused', value: 'PAUSED' },
						{ name: 'Dropped', value: 'DROPPED' },
					],
				},
			])
		return selectedListType
	}
	/**
	 * Save a media entry to the authenticated user's list, logging the outcome.
	 */
	private static async saveEntryToList(
		mutation: string,
		mediaId: number | string,
		status: string
	) {
		if (!(await Auth.isLoggedIn())) {
			console.error(`\nPlease log in first to use this feature.`)
			return
		}
		const response: SaveMediaListEntryResponse = await fetcher(mutation, {
			mediaId,
			status,
		})
		const saved = response?.data?.SaveMediaListEntry
		if (saved) {
			console.log(`\nEntry ${saved.id}. Saved as ${saved.status}.`)
		} else {
			console.error(
				`\nFailed to save the entry. ${response?.errors?.[0]?.message || 'Unknown error'}`
			)
		}
	}
	/**
	 * Import a previously exported AniList JSON file, saving each entry with
	 * progress via the given mutation.
	 */
	private static async importJSONList(
		mutation: string,
		buildVariables: (item: {
			id: number
			progress: number
			status: string
			private?: boolean
		}) => object,
		label: 'anime' | 'manga'
	) {
		try {
			const filename = await selectFile('.json')
			if (!filename) {
				return
			}
			const filePath = join(getDownloadFolderPath(), filename)
			const fileContent = await readFile(filePath, 'utf8')
			const importedData = JSON.parse(fileContent)

			if (!Validate.Import_JSON(importedData)) {
				console.error(`\nInvalid JSON file.`)
				return
			}

			let count = 0
			const batchSize = 1

			for (let i = 0; i < importedData.length; i += batchSize) {
				const batch = importedData.slice(i, i + batchSize)

				await Promise.all(
					batch.map(
						async (item: {
							id: number
							progress: number
							status: string
							private?: boolean
						}) => {
							try {
								const save: {
									data?: { SaveMediaListEntry: { id: number } }
									errors?: { message: string }
								} = await fetcher(mutation, buildVariables(item))
								if (save) {
									const id = save?.data?.SaveMediaListEntry?.id
									count++
									console.log(`[${count}]\t${id}\t${item?.id} ✅`)
								} else {
									console.error(`\nError saving ${item?.id}`)
								}
							} catch (error) {
								console.error(
									`\nError saving ${item?.id}: ${(error as Error).message}`
								)
							}
						}
					)
				)
			}

			console.log(`\nTotal ${count} ${label}(s) imported successfully.`)
		} catch (error) {
			console.error(`\n${(error as Error).message}`)
		}
	}
	static async importAnime() {
		return AniList.importJSONList(
			saveAnimeWithProgressMutation,
			(anime) => ({
				mediaId: anime?.id,
				progress: anime?.progress,
				status: anime?.status,
				hiddenFromStatusLists: false,
			}),
			'anime'
		)
	}
	static async importManga() {
		return AniList.importJSONList(
			saveMangaWithProgressMutation,
			(manga) => ({
				mediaId: manga?.id,
				progress: manga?.progress,
				status: manga?.status,
				hiddenFromStatusLists: false,
				private: manga?.private,
			}),
			'manga'
		)
	}
	/**
	 * Prompt for CSV/JSON/XML and dispatch to the matching exporter.
	 */
	private static async promptExportFormatAndSave(
		mediaWithProgress: MediaWithProgress[],
		dataType: 'anime' | 'manga',
		xmlLabel: string,
		exportAsXML: () => Promise<void>
	) {
		const { exportType }: { exportType: number } = await inquirer.prompt([
			{
				type: 'list',
				name: 'exportType',
				message: 'Choose export type:',
				choices: [
					{ name: 'CSV', value: 1 },
					{ name: 'JSON', value: 2 },
					{ name: xmlLabel, value: 3 },
				],
				pageSize: 10,
			},
		])
		switch (exportType) {
			case 1:
				await saveJSONasCSV(mediaWithProgress, dataType)
				break
			case 2:
				await saveJSONasJSON(mediaWithProgress, dataType)
				break
			case 3:
				await exportAsXML()
				break
			default:
				console.log(`\nInvalid export type. ${exportType}`)
				break
		}
	}
	static async exportAnime() {
		if (!(await Auth.isLoggedIn())) {
			console.error(`\nMust login to use this feature.`)
			return
		}
		const animeList: MediaListCollectionResponse = await fetcher(
			currentUserAnimeList,
			{
				id: await Auth.MyUserId(),
			}
		)
		if (!animeList) {
			console.error(`\nNo anime(s) found in your lists.`)
			return
		}
		const lists = animeList?.data?.MediaListCollection?.lists ?? []
		const mediaWithProgress = lists.flatMap((list: MediaList) =>
			list.entries.map((entry: MediaListEntry) => ({
				id: entry?.media?.id,
				title: entry?.media?.title,
				episodes: entry?.media?.episodes,
				siteUrl: entry?.media?.siteUrl,
				progress: entry.progress,
				status: entry?.status,
				hiddenFromStatusLists: entry.hiddenFromStatusLists,
			}))
		)
		await AniList.promptExportFormatAndSave(
			mediaWithProgress,
			'anime',
			'XML (MyAnimeList/AniDB)',
			MyAnimeList.exportAnime
		)
	}
	static async exportManga() {
		if (!(await Auth.isLoggedIn())) {
			console.error(`\nPlease login to use this feature.`)
			return
		}
		const mangaLists: MediaListCollectionResponse = await fetcher(
			currentUserMangaList,
			{
				id: await Auth.MyUserId(),
			}
		)
		if (!mangaLists?.data) {
			console.error(`\nCould not get manga list.`)
			return
		}
		const lists = mangaLists?.data?.MediaListCollection?.lists || []
		if (lists.length === 0) {
			console.log(`\nList seems to be empty.`)
			return
		}
		const mediaWithProgress = lists.flatMap((list: MediaList) =>
			list.entries.map((entry: MediaListEntry) => ({
				id: entry?.media?.id,
				title: entry?.media?.title,
				private: entry.private,
				chapters: entry.media.chapters,
				progress: entry.progress,
				status: entry?.status,
				hiddenFromStatusLists: entry.hiddenFromStatusLists,
			}))
		)
		await AniList.promptExportFormatAndSave(
			mediaWithProgress,
			'manga',
			'XML (MyAnimeList)',
			MyAnimeList.exportManga
		)
	}
	/**
	 * Pick an existing entry from one of the user's own lists and re-save it
	 * under a (possibly different) list status.
	 */
	private static async pickFromMyListAndResave(
		listQuery: string,
		addMutation: string,
		kind: 'ANIME' | 'MANGA'
	) {
		try {
			const label = kind === 'ANIME' ? 'anime' : 'manga'
			if (!(await Auth.isLoggedIn())) {
				return console.error(`\nPlease log in first to access your lists.`)
			}

			const userId = await Auth.MyUserId()
			if (!userId) {
				return console.error(`\nFailed getting current user Id.`)
			}

			const response: MediaListCollectionResponse = await fetcher(listQuery, {
				id: userId,
			})

			if (!response?.data) {
				return console.error(
					`\nSomething went wrong. ${response?.errors?.[0]?.message || 'Unknown error'}`
				)
			}

			const lists = response?.data?.MediaListCollection?.lists
			if (!lists || lists.length === 0) {
				return console.log(`\nYou seem to have no ${label}(s) in your lists.`)
			}

			const { selectedList } = await inquirer.prompt([
				{
					type: 'list',
					name: 'selectedList',
					message: `Select a${kind === 'ANIME' ? 'n' : ''} ${label} list:`,
					choices: lists.map((list: MediaList) => list.name),
				},
			])

			const selectedEntries = lists.find(
				(list: MediaList) => list.name === selectedList
			)

			if (!selectedEntries || !selectedEntries.entries.length) {
				return console.log(
					`\nNo entries found or not available at this moment.`
				)
			}

			console.log(`\nEntries for '${selectedEntries.name}':`)

			const { selectedMedia }: { selectedMedia: number } =
				await inquirer.prompt([
					{
						type: 'list',
						name: 'selectedMedia',
						message: `Select ${label} to add to the list:`,
						choices: selectedEntries.entries.map(
							(entry: MediaListEntry, idx: number) => ({
								name: `[${idx + 1}] ${getTitle(entry.media.title)}`,
								value: entry.media.id,
							})
						),
						pageSize: 10,
					},
				])

			const selectedListType = await AniList.promptListType(kind)

			await AniList.saveEntryToList(
				addMutation,
				selectedMedia,
				selectedListType
			)
		} catch (error) {
			console.log(`\nSomething went wrong. ${(error as Error).message}`)
		}
	}
	static async MyAnime() {
		return AniList.pickFromMyListAndResave(
			currentUserAnimeList,
			addAnimeToListMutation,
			'ANIME'
		)
	}
	static async MyManga() {
		return AniList.pickFromMyListAndResave(
			currentUserMangaList,
			addMangaToListMutation,
			'MANGA'
		)
	}
	/**
	 * Page through a media browse query (trending/popular/upcoming), letting the
	 * user "see more" or pick an entry to add to one of their lists.
	 */
	private static async browseAndAddAnime(
		query: string,
		count: number,
		extraVariables: Record<string, unknown>,
		emptyMessage: string
	) {
		try {
			let page = 1
			let allMedia: MediaList[] = []

			while (true) {
				const response: {
					data?: { Page: { media: MediaList[] } }
					errors?: { message: string }[]
				} = await fetcher(query, { page, perPage: count, ...extraVariables })

				if (!response?.data) {
					console.error(
						`\nSomething went wrong. ${response?.errors?.[0]?.message || 'Unknown error'}`
					)
					return
				}

				const media = response?.data?.Page?.media
				if (!media || media.length === 0) {
					console.log(`\n${emptyMessage}`)
					break
				}

				allMedia = [...allMedia, ...media]

				const choices = allMedia.map((anime: MediaList, idx: number) => ({
					name: `[${idx + 1}] ${getTitle(anime?.title)}`,
					value: String(anime?.id),
				}))
				choices.push({ name: 'See more', value: 'see_more' })

				const { selectedAnime } = await inquirer.prompt([
					{
						type: 'list',
						name: 'selectedAnime',
						message: 'Select anime to add to the list:',
						choices,
						pageSize: choices.length + 1,
					},
				])

				if (selectedAnime === 'see_more') {
					page++
					continue
				}

				const selectedListType = await AniList.promptListType('ANIME')
				await AniList.saveEntryToList(
					addAnimeToListMutation,
					selectedAnime,
					selectedListType
				)
				break
			}
		} catch (error) {
			console.error(`\nSomething went wrong. ${(error as Error).message}`)
		}
	}
	static async getTrendingAnime(count: number) {
		return AniList.browseAndAddAnime(
			trendingQuery,
			count,
			{},
			'No more trending anime available.'
		)
	}
	static async getPopularAnime(count: number) {
		return AniList.browseAndAddAnime(
			popularQuery,
			count,
			{},
			'No more popular anime available.'
		)
	}
	static async getUpcomingAnime(count: number) {
		const { nextSeason, nextYear } = getNextSeasonAndYear()
		return AniList.browseAndAddAnime(
			upcomingAnimesQuery,
			count,
			{ nextSeason, nextYear },
			'No more upcoming anime available.'
		)
	}
	static async getUserByUsername(username: string) {
		try {
			const response: UserResponse = await fetcher(userQuery, { username })

			if (!response?.data?.User) {
				return console.error(
					`\n${response?.errors?.[0]?.message || 'Unknown error'}`
				)
			}

			const user = response.data.User
			const userActivityResponse: UserActivitiesResponse = await fetcher(
				userActivityQuery,
				{
					id: user.id,
					page: 1,
					perPage: 10,
				}
			)
			const activities = userActivityResponse?.data?.Page?.activities ?? []
			// Get follower/following information
			const req_followers: UserFollower = await fetcher(userFollowersQuery, {
				userId: user?.id,
			})
			const req_following: UserFollowing = await fetcher(userFollowingQuery, {
				userId: user?.id,
			})
			const followersCount = req_followers?.data?.Page?.pageInfo?.total || 0
			const followingCount = req_following?.data?.Page?.pageInfo?.total || 0

			logUserDetails(user, followersCount, followingCount)

			if (activities.length > 0) {
				console.log(`\nRecent Activities:`)
				activities.forEach(({ status, progress, media, createdAt }) => {
					responsiveOutput(
						`${timestampToTimeAgo(createdAt)}\t${status} ${progress ? `${progress} of ` : ''}${getTitle(media?.title)}`
					)
				})
			} else {
				console.log('\nNo recent activities.')
			}
		} catch (error) {
			console.error(`\nSomething went wrong. ${error.message}`)
		}
	}
	static async getAnimeDetailsByID(anilistID: number) {
		const details: AnimeDetails = await fetcher(animeDetailsQuery, {
			id: anilistID,
		})

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
			console.log(`Episode Duration: ${duration || 'Unknown'} min`)
			console.log(`Origin: ${countryOfOrigin || 'N/A'}`)
			console.log(`Status: ${status || 'N/A'}`)
			console.log(`Format: ${format || 'N/A'}`)
			console.log(`Genres: ${genres.length ? genres.join(', ') : 'N/A'}`)
			console.log(`Season: ${season || 'N/A'}`)
			console.log(`Url: ${siteUrl || 'N/A'}`)
			console.log(`isAdult: ${isAdult ? 'Yes' : 'No'}`)
			console.log(`Released: ${formatDateObject(startDate) || 'Unknown'}`)
			console.log(`Finished: ${formatDateObject(endDate) || 'Ongoing'}`)
		}
	}
	static async getMangaDetailsByID(mangaID: number) {
		try {
			const response: MangaDetails = await fetcher(mangaDetailsQuery, {
				id: mangaID,
			})
			if (response?.errors) {
				console.error(`${response.errors[0].message}`)
				return
			}
			const manga = response?.data?.Media
			if (manga) {
				console.log(`\n[${getTitle(manga.title)}]`)
				console.log(`${manga.description}`)
				console.log(`Chapters: ${manga.chapters}\t Volumes: ${manga.volumes}`)
				console.log(`Status:\t${manga.status}`)
				console.log(`Genres:\t${manga.genres.join(', ')}`)
				console.log(`Start:\t${simpleDateFormat(manga.startDate)}`)
				console.log(`End:\t${simpleDateFormat(manga.endDate)}`)
			}
		} catch (error) {
			console.error(`${(error as Error).message}`)
		}
	}
	/**
	 * Search AniList and let the user pick a result to add to one of their lists.
	 */
	private static async searchAndAddToList(
		query: string,
		addMutation: string,
		search: string,
		count: number,
		kind: 'ANIME' | 'MANGA'
	) {
		const label = kind === 'ANIME' ? 'anime' : 'manga'
		const searchResults: {
			data?: { Page: { media: { id: number; title: MediaTitle }[] } }
			errors?: { message: string }[]
		} = await fetcher(query, { search, page: 1, perPage: count })

		if (!searchResults) {
			console.error(`\nSomething went wrong.`)
			return
		}

		const results = searchResults?.data?.Page?.media
		if (!results || results.length === 0) {
			console.log(`\nNo search results found.`)
			return
		}

		const { selectedMedia }: { selectedMedia: number } = await inquirer.prompt([
			{
				type: 'list',
				name: 'selectedMedia',
				message: `Select ${label} to add to your list:`,
				choices: results.map((res, idx: number) => ({
					name: `[${idx + 1}] ${getTitle(res?.title)}`,
					value: res?.id,
				})),
				pageSize: 10,
			},
		])

		const selectedListType = await AniList.promptListType(kind)

		await AniList.saveEntryToList(addMutation, selectedMedia, selectedListType)
	}
	static async searchAnime(search: string, count: number) {
		return AniList.searchAndAddToList(
			animeSearchQuery,
			addAnimeToListMutation,
			search,
			count,
			'ANIME'
		)
	}
	static async searchManga(search: string, count: number) {
		return AniList.searchAndAddToList(
			mangaSearchQuery,
			addMangaToListMutation,
			search,
			count,
			'MANGA'
		)
	}
}

class MyAnimeList {
	/**
	 * Import a MyAnimeList export XML file, mapping each entry to its AniList
	 * equivalent by MAL id and saving it with progress.
	 */
	private static async importMALList(options: {
		validator: (xmlData: string) => Promise<boolean>
		listKey: 'anime' | 'manga'
		malIdField: string
		progressField: string
		statusMap: Record<string, AniListMediaStatus>
		malIdQuery: string
		saveMutation: string
	}) {
		try {
			const filename: string = await selectFile('.xml')
			if (!filename) {
				return
			}
			const filePath: string = join(getDownloadFolderPath(), filename)
			const fileContent: string = await readFile(filePath, 'utf8')
			if (!(await options.validator(fileContent))) {
				console.error(`\nInvalid XML file.`)
				return
			}

			const parser: XMLParser = new XMLParser()
			const XMLObject = parser.parse(fileContent)
			const entries = XMLObject?.myanimelist?.[options.listKey]

			if (!entries || entries.length === 0) {
				console.log(`\nNo ${options.listKey} list found in the file.`)
				return
			}

			let count = 0
			for (const entry of entries) {
				const malId: number = entry[options.malIdField]
				const progress: number = entry[options.progressField]
				const status: string = options.statusMap[entry.my_status]

				try {
					// Fetch AniList ID using MAL ID
					const anilistResponse: MalIdToAnilistIdResponse = await fetcher(
						options.malIdQuery,
						{ malId }
					)
					const anilistId = anilistResponse?.data?.Media?.id

					if (anilistId) {
						// Save entry with progress
						const saveResponse: saveAnimeWithProgressResponse = await fetcher(
							options.saveMutation,
							{
								mediaId: anilistId,
								progress,
								status,
								hiddenFromStatusLists: false,
								private: false,
							}
						)
						const entryId = saveResponse?.data?.SaveMediaListEntry?.id

						if (entryId) {
							count++
							console.log(`[${count}] ${entryId} ✅`)
						} else {
							console.error(`Failed to save entry for ${malId}`)
						}
					} else {
						console.error(`Could not retrieve AniList ID for MAL ID ${malId}`)
					}
				} catch (error) {
					console.error(
						`Error processing MAL ID ${malId}: ${(error as Error).message}`
					)
				}
			}

			console.log(`\nTotal Entries Processed: ${count}`)
		} catch (error) {
			console.error(
				`\nError in MAL import process: ${(error as Error).message}`
			)
		}
	}
	static async importAnime() {
		return MyAnimeList.importMALList({
			validator: Validate.Import_AnimeXML,
			listKey: 'anime',
			malIdField: 'series_animedb_id',
			progressField: 'my_watched_episodes',
			statusMap: {
				'On-Hold': AniListMediaStatus.PAUSED,
				'Dropped': AniListMediaStatus.DROPPED,
				'Completed': AniListMediaStatus.COMPLETED,
				'Watching': AniListMediaStatus.CURRENT,
				'Plan to Watch': AniListMediaStatus.PLANNING,
			},
			malIdQuery: malIdToAnilistAnimeId,
			saveMutation: saveAnimeWithProgressMutation,
		})
	}
	static async importManga() {
		return MyAnimeList.importMALList({
			validator: Validate.Import_MangaXML,
			listKey: 'manga',
			malIdField: 'manga_mangadb_id',
			progressField: 'my_read_chapters',
			statusMap: {
				'On-Hold': AniListMediaStatus.PAUSED,
				'Dropped': AniListMediaStatus.DROPPED,
				'Completed': AniListMediaStatus.COMPLETED,
				'Reading': AniListMediaStatus.CURRENT,
				'Plan to Read': AniListMediaStatus.PLANNING,
			},
			malIdQuery: malIdToAnilistMangaId,
			saveMutation: saveMangaWithProgressMutation,
		})
	}
	/**
	 * Fetch the authenticated user's anime/manga list and export it as MAL XML.
	 */
	private static async exportMALList<T>(
		listQuery: string,
		mapEntry: (entry: T) => MediaWithProgress,
		dataType: 0 | 1
	) {
		try {
			if (!(await Auth.isLoggedIn())) {
				console.log(`\nPlease login to use this feature.`)
				return
			}
			const list: AnimeList = await fetcher(listQuery, {
				id: await Auth.MyUserId(),
			})
			const lists = list?.data?.MediaListCollection?.lists
			if (!lists || lists.length === 0) {
				console.log(
					`\nHey, ${await Auth.MyUserName()}. Your anime list seems to be empty.`
				)
				return
			}
			const mediaWithProgress = lists.flatMap((l: MediaList) =>
				(l.entries as unknown as T[]).map(mapEntry)
			)
			await saveJSONasXML(mediaWithProgress, dataType)
		} catch (error) {
			console.error(`\nError from MALexport. ${(error as Error).message}`)
		}
	}
	static async exportAnime() {
		return MyAnimeList.exportMALList(
			currentUserAnimeList,
			(entry: MediaListEntry) => ({
				id: entry?.media?.id,
				malId: entry?.media?.idMal,
				title: entry?.media?.title,
				episodes: entry?.media?.episodes,
				siteUrl: entry?.media?.siteUrl,
				progress: entry.progress,
				status: entry?.status,
				hiddenFromStatusLists: false,
				format: entry?.media?.format,
			}),
			0
		)
	}
	static async exportManga() {
		return MyAnimeList.exportMALList(
			currentUserMangaList,
			(entry: MediaEntry) => ({
				id: entry.media.id,
				malId: entry.media.idMal,
				title: entry.media.title,
				private: entry.private,
				chapters: entry.media.chapters,
				progress: entry.progress,
				status: entry.status,
				hiddenFromStatusLists: entry.hiddenFromStatusLists,
			}),
			1
		)
	}
}

class AniDB {
	static async importAnime() {
		try {
			const filename: string = await selectFile('.json')
			if (!filename) {
				return
			}
			const filePath: string = join(getDownloadFolderPath(), filename)
			const fileContent: string = await readFile(filePath, 'utf8')
			const js0n_repaired = jsonrepair(fileContent)

			if (!(await Validate.Import_AniDBJSONLarge(js0n_repaired))) {
				console.error(`\nInvalid JSON Large file.`)
				return
			}

			if (js0n_repaired) {
				const obj3ct = await JSON.parse(js0n_repaired)
				const animeList = obj3ct?.anime

				if (animeList?.length > 0) {
					let count = 0
					let iteration = 0
					let missed: {
						anidbId: number
						englishTitle?: string
						romajiTitle?: string
					}[] = []
					for (const anime of animeList) {
						iteration++
						const anidbId: number = anime.id
						const released: string = anime.broadcastDate // DD-MM-YYYY (eg: "23.07.2016")
						const status: string = anime.status
						// const type = anime.type
						const totalEpisodes = anime.totalEpisodes
						const ownEpisodes = anime.ownEpisodes
						const romanjiName = anime.romanjiName
						const englishName = anime.englishName

						function getStatus(anidbStatus: string, episodesSeen: string) {
							if (anidbStatus === 'complete') {
								return AniListMediaStatus.COMPLETED
							} else if (
								anidbStatus === 'incomplete' &&
								Number(episodesSeen) > 0
							) {
								return AniListMediaStatus.CURRENT
							} else {
								return AniListMediaStatus.PLANNING
							}
						}

						let anilistId = await anidbToanilistMapper(
							romanjiName,
							Number(released.split('.')[2]),
							englishName
						)

						if (anilistId) {
							try {
								const saveResponse: {
									data?: { SaveMediaListEntry: { id: number; status: string } }
									errors?: { message: string }[]
								} = await fetcher(saveAnimeWithProgressMutation, {
									mediaId: anilistId,
									progress: ownEpisodes - 2,
									status: getStatus(status, ownEpisodes),
									hiddenFromStatusLists: false,
									private: false,
								})

								const entryId = saveResponse?.data?.SaveMediaListEntry?.id
								if (entryId) {
									count++
									responsiveOutput(
										`[${count}]\t${entryId} ✅\t${anidbId}\t${anilistId}\t(${ownEpisodes}/${totalEpisodes})\t${status}–>${getStatus(status, ownEpisodes)}`
									)
								}
							} catch (error) {
								console.error(
									`Error processing AniDB ID ${anidbId}: ${(error as Error).message}`
								)
							}
						} else {
							missed.push({
								anidbId: anidbId,
								englishTitle: englishName,
								romajiTitle: romanjiName,
							})
						}
					}
					responsiveOutput(
						`\nAccuracy: ${(((animeList.length - missed.length) / animeList.length) * 100).toFixed(2)}%\tTotal Processed: ${iteration}\tMissed: ${missed.length}`
					)
					if (missed.length > 0) {
						responsiveOutput(
							`Exporting missed entries to JSON file, Please add them manually.`
						)
						await saveJSONasJSON(missed, 'anidb-missed')
					}
				} else {
					console.log(`\nNo anime list found in the file.`)
				}
			} else {
				console.log(`\nNo content found in the file or unable to read.`)
			}
		} catch (error) {
			console.error(
				`\nError in AniDB import process: ${(error as Error).message}`
			)
		}
	}
}

export { AniDB, AniList, MyAnimeList }
