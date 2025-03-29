import { animeDetailsQuery } from "../dist/helpers/queries.ts"

test("[API] Anime", async () => {
  const request = await fetch(`https://graphql.anilist.co`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: animeDetailsQuery,
      variables: { id: 21 },
    }),
  })
  expect(request.status).toBe(200)
})
