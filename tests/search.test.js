import { animeSearchQuery, mangaSearchQuery } from '../dist/helpers/queries.ts'

test('[API] Anime Search', async () => {
	const request = await fetch(`https://graphql.anilist.co`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			query: animeSearchQuery,
			variables: { search: 'one piece', page: 1, perPage: 10 },
		}),
	})
	expect(request.status).toBe(200)
})

test('[API] Manga Search', async () => {
	const request = await fetch(`https://graphql.anilist.co`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			query: mangaSearchQuery,
			variables: { search: 'one piece', page: 1, perPage: 10 },
		}),
	})
	expect(request.status).toBe(200)
})
