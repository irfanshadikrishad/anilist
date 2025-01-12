import {
  userFollowersQuery,
  userFollowingQuery,
  userQuery,
} from "../dist/helpers/queries.ts"

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

test("[API] Followers", async () => {
  const request = await fetch(`https://graphql.anilist.co`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: userFollowersQuery,
      variables: { userId: 5465210 },
    }),
  })
  expect(request.status).toBe(200)
})

test("[API] Following", async () => {
  const request = await fetch(`https://graphql.anilist.co`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: userFollowingQuery,
      variables: { userId: 5465210 },
    }),
  })
  expect(request.status).toBe(200)
})
