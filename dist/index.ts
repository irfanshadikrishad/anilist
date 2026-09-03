#!/usr/bin/env node
import { Command } from 'commander'
import process from 'process'
import { Auth, Social } from './helpers/auth.js'
import { AniList } from './helpers/lists.js'
import { getCurrentPackageVersion } from './helpers/workers.js'

const cli = new Command()

/**
 * Dispatch to one of two handlers based on a mutually-exclusive pair of boolean
 * flags (eg: --anime/--manga, --follow/--unfollow), optionally requiring login.
 */
async function dispatchBinaryOption(
	flagA: boolean,
	flagB: boolean,
	optionNames: [string, string],
	handlerA: () => Promise<unknown>,
	handlerB: () => Promise<unknown>,
	{ requireLogin = false }: { requireLogin?: boolean } = {}
) {
	if ((!flagA && !flagB) || (flagA && flagB)) {
		console.error(
			`\nMust select an option, either --${optionNames[0]} or --${optionNames[1]}`
		)
		return
	}
	if (requireLogin && !(await Auth.isLoggedIn())) {
		console.error(`\nPlease login to use this feature.`)
		return
	}
	await (flagA ? handlerA() : handlerB())
}

cli
	.name('anilist')
	.description(
		'Minimalist unofficial AniList CLI for Anime and Manga Enthusiasts.'
	)
	.version(getCurrentPackageVersion())
cli
	.command('login')
	.description('Login with AniList')
	.requiredOption('-i, --id <number>', null)
	.requiredOption('-s, --secret <string>', null)
	.action(async ({ id, secret }) => {
		if (id && secret) {
			await Auth.Login(id, secret)
		} else {
			console.log('\nMust provide both ClientId and ClientSecret!')
		}
	})
cli
	.command('whoami')
	.description('Get details of the logged in user')
	.action(async () => {
		await Auth.Myself()
	})
cli
	.command('trending')
	.alias('tr')
	.description('Get the trending list from AniList')
	.option('-c, --count <number>', 'Number of list items to get', '10')
	.action(async ({ count }) => {
		await AniList.getTrendingAnime(Number(count))
	})
cli
	.command('popular')
	.alias('plr')
	.description('Get the popular list from AniList')
	.option('-c, --count <number>', 'Number of list items to get', '10')
	.action(async ({ count }) => {
		await AniList.getPopularAnime(Number(count))
	})
cli
	.command('user <username>')
	.description('Get user information')
	.action(async (username) => {
		await AniList.getUserByUsername(username)
	})
cli
	.command('logout')
	.description('Log out the current user.')
	.action(async () => {
		await Auth.Logout()
	})
cli
	.command('lists')
	.alias('ls')
	.description('Get anime or manga list of authenticated user.')
	.option('-a, --anime', 'For anime list of authenticated user', false)
	.option('-m, --manga', 'For manga list of authenticated user', false)
	.action(async ({ anime, manga }) =>
		dispatchBinaryOption(
			anime,
			manga,
			['anime', 'manga'],
			AniList.MyAnime,
			AniList.MyManga
		)
	)
cli
	.command('delete')
	.alias('del')
	.description('Delete entire collections of anime or manga')
	.option('-a, --anime', 'For anime list of authenticated user', false)
	.option('-m, --manga', 'For manga list of authenticated user', false)
	.option('-s, --activity', 'For activity of authenticated user', false)
	.action(async ({ anime, manga, activity }) => {
		const selectedOptions = [anime, manga, activity].filter(Boolean).length
		if (selectedOptions === 0) {
			console.error(
				`\nMust select one option: either --anime, --manga, or --activity`
			)
			process.exit(1)
		}
		if (selectedOptions > 1) {
			console.error(
				`\nOnly one option can be selected at a time: --anime, --manga, or --activity`
			)
			process.exit(1)
		}
		if (anime) {
			await Auth.DeleteMyAnimeList()
		} else if (manga) {
			await Auth.DeleteMyMangaList()
		} else if (activity) {
			await Auth.DeleteMyActivities()
		}
	})
cli
	.command('upcoming')
	.alias('up')
	.description('Anime that will be released in upcoming season')
	.option('-c, --count <number>', 'Number of items to get', '10')
	.action(async ({ count }) => {
		await AniList.getUpcomingAnime(Number(count))
	})
cli
	.command('anime <id>')
	.description('Get anime details by their ID')
	.action(async (id) => {
		if (id && !Number.isNaN(Number(id))) {
			await AniList.getAnimeDetailsByID(Number(id))
		} else {
			console.error(
				`\nInvalid or missing ID (${id}). Please provide a valid numeric ID.`
			)
		}
	})
cli
	.command('manga <id>')
	.description('Get manga details by their ID')
	.option('-c, --count <number>', 'Number of items to get', '10')
	.action(async (id) => {
		await AniList.getMangaDetailsByID(id)
	})
cli
	.command('search <query>')
	.alias('srch')
	.alias('find')
	.description('Search anime or manga.')
	.option('-a, --anime', 'To get the anime search results.', false)
	.option('-m, --manga', 'To get the manga search results.', false)
	.option('-c, --count <number>', 'Number of search results to show.', '10')
	.action(async (query, { anime, manga, count }) =>
		dispatchBinaryOption(
			anime,
			manga,
			['anime', 'manga'],
			() => AniList.searchAnime(query, Number(count)),
			() => AniList.searchManga(query, Number(count))
		)
	)
cli
	.command('status <status>')
	.alias('post')
	.alias('write')
	.description('Write a status...')
	.action(async (status) => {
		await Auth.Write(status)
	})
cli
	.command('export')
	.alias('exp')
	.description('Export your anime or manga list.')
	.option('-a, --anime', 'To get the anime search results.', false)
	.option('-m, --manga', 'To get the manga search results.', false)
	.action(async ({ anime, manga }) =>
		dispatchBinaryOption(
			anime,
			manga,
			['anime', 'manga'],
			AniList.exportAnime,
			AniList.exportManga
		)
	)
cli
	.command('import')
	.alias('imp')
	.description('Import your anime or manga from anilist or other sources.')
	.option('-a, --anime', 'To get the anime search results.', false)
	.option('-m, --manga', 'To get the manga search results.', false)
	.action(async ({ anime, manga }) =>
		dispatchBinaryOption(
			anime,
			manga,
			['anime', 'manga'],
			Auth.callAnimeImporter,
			Auth.callMangaImporter,
			{ requireLogin: true }
		)
	)
cli
	.command('autolike')
	.alias('al')
	.description('Autolike following or global activities.')
	.action(async () => {
		await Auth.AutoLike()
	})
cli
	.command('social')
	.alias('sol')
	.description('Automate your process')
	.option('-f, --follow', 'Follow the user whos following you.', false)
	.option('-u, --unfollow', 'Unfollow the user whos not following you.', false)
	.action(async ({ follow, unfollow }) =>
		dispatchBinaryOption(
			follow,
			unfollow,
			['follow', 'unfollow'],
			Social.follow,
			Social.unfollow,
			{ requireLogin: true }
		)
	)

cli.parse(process.argv)
