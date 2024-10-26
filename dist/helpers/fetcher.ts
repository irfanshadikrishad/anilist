import fetch from "node-fetch"
import { Auth } from "./auth.js"

/**
 * Sends a GraphQL request to the AniList API.
 *
 * This function constructs a request with the provided query and variables,
 * handles authorization, and processes the API response.
 *
 * @param {string} query - The AniList GraphQL query to be executed.
 * @param {object} variables - An object containing the variables for the query.
 * @returns {Promise<object|null>} The response from the API as a JSON object if successful; otherwise, null.
 */
async function fetcher(query: string, variables?: object): Promise<any | null> {
  const headers = {
    "content-type": "application/json",
  }
  if (await Auth.isLoggedIn()) {
    headers["Authorization"] = `Bearer ${await Auth.RetriveAccessToken()}`
  }
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  // Check if the response is successful
  if (response.status !== 200) {
    // If the status is 429, handle the rate limit
    if (response.status === 429) {
      console.warn("Rate limit hit. Waiting for 1 minute before retrying...")
      await new Promise((resolve) => setTimeout(resolve, 60000)) // Wait for 1 minute
      return fetcher(query, variables) // Retry the request
    } else {
      throw new Error(`\nError fetching data: ${response.statusText}`)
    }
  }

  const data = await response.json()
  return data
}

export { fetcher }
