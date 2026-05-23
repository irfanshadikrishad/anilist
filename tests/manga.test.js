import { mangaDetailsQuery } from '../dist/helpers/queries.ts'

test('[API] Manga', async () => {
  const request = await fetch(`https://graphql.anilist.co`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mangaDetailsQuery,
      variables: { id: 30013 },
    }),
  })
  const { data } = await request.json()
  expect(request.status).toBe(200)
  expect(data.Media.id).toBe(30013)
})
