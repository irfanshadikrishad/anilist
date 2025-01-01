import { userQuery } from "../dist/helpers/queries.ts"

test("[API] User", async () => {
  const request = await fetch(`https://graphql.anilist.co`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: userQuery,
      variables: { username: "zeitu" },
    }),
  })
  expect(request.status).toBe(200)
})
