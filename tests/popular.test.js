import { popularQuery } from '../dist/helpers/queries.ts'

test('[API] Popular', async () => {
	const request = await fetch(`https://graphql.anilist.co`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			query: popularQuery,
			variables: { page: 1, perPage: 10 },
		}),
	})
	const { data } = await request.json()
	expect(Array.isArray(data.Page.media)).toBe(true)
})
