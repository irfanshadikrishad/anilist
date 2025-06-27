import fetch from "node-fetch"
import { Auth } from "./auth.js"
import { aniListEndpoint, handleRateLimitRetry } from "./workers.js"

/**
 * Sends a GraphQL request to the AniList API.
 *
 * This function constructs a request with the provided query and variables,
 * handles authorization, and processes the API response. If a rate-limit error (429) is returned,
 * it waits for 1 minute and retries the request.
 *
 * @param {string} query - The AniList GraphQL query to be executed.
 * @param {object} variables - An object containing the variables for the query.
 * @returns {Promise<object|null>} The response from the API as a JSON object if successful; otherwise, null.
 */
async function fetcher(
  query: string,
  variables: object
): Promise<object | null> {
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    }

    const token = (await Auth.isLoggedIn())
      ? await Auth.RetriveAccessToken()
      : null
    if (token) headers["Authorization"] = `Bearer ${token}`

    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query, variables }),
    })

    const response: { errors?: { message: string }[] } = await request.json()

    if (request.status === 200) {
      return response
    } else if (request.status === 429) {
      await handleRateLimitRetry(60)
      return await fetcher(query, variables)
    } else {
      console.error(
        `\n${request.status} ${response?.errors?.[0]?.message || "Unknown error"}.`
      )
      return null
    }
  } catch (error) {
    console.error(`\nSomething went wrong. ${(error as Error).message}.`)
    return null
  }
}

export { fetcher }
