import fetch from "node-fetch"
import { Auth } from "./auth.js"
import { aniListEndpoint } from "./workers.js"

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
async function fetcher(
  query: string,
  variables: object
): Promise<object | null> {
  try {
    const headers = {
      "content-type": "application/json",
    }
    if (await Auth.isLoggedIn()) {
      headers["Authorization"] = `Bearer ${await Auth.RetriveAccessToken()}`
    }
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query, variables }),
    })
    const response: any = await request.json()
    if (request.status === 200) {
      return response
    } else {
      console.error(`\n${request.status} ${response?.errors[0]?.message}.`)
      return null
    }
  } catch (error) {
    console.error(`\nSomething went wrong. ${(error as Error).message}.`)
    return null
  }
}

export { fetcher }
