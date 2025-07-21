import { upcomingAnimesQuery } from '../dist/helpers/queries.ts'

test('[API] Upcoming', async () => {
  const request = await fetch(`https://graphql.anilist.co`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: upcomingAnimesQuery,
      variables: { page: 1, perPage: 10 },
    }),
  })
  const { data } = await request.json()
  expect(Array.isArray(data.Page.media)).toBe(true)
})
