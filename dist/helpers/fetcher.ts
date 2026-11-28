import fetch from 'node-fetch'
import { Auth } from './auth.js'
import { aniListEndpoint, handleRateLimitRetry } from './workers.js'

/**
 * Sends a GraphQL request to the AniList API.
 *
 * @param query - The GraphQL query to execute.
 * @param variables - Variables for the GraphQL query.
 * @returns The API response if successful; otherwise, null.
 */
async function fetcher<T = Record<string, unknown>>(
  query: string,
  variables: object
): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }

    const token = (await Auth.isLoggedIn())
      ? await Auth.RetriveAccessToken()
      : null

    if (token) headers['Authorization'] = `Bearer ${token}`

    const request = await fetch(aniListEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    })

    const response = (await request.json()) as T & {
      errors?: { message: string }[]
    }

    if (request.status === 200) {
      return response
    }

    if (request.status === 429) {
      await handleRateLimitRetry(60)
      return fetcher<T>(query, variables)
    }

    console.error(
      `\n${request.status} ${response?.errors?.[0]?.message || 'Unknown error'}.`
    )

    return null
  } catch (error) {
    console.error(
      `\nSomething went wrong. ${error instanceof Error ? error.message : String(error)}.`
    )
    return null
  }
}

export { fetcher }
