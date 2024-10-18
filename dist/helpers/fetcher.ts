import fetch from "node-fetch";
import { aniListEndpoint } from "./workers.js";
import { isLoggedIn, retriveAccessToken } from "./auth.js";

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
    const LOGGEDIN = await isLoggedIn();
    const headers = {
      "content-type": "application/json",
    };
    if (LOGGEDIN) {
      headers["Authorization"] = `Bearer ${await retriveAccessToken()}`;
    }
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query, variables }),
    });
    const response: any = await request.json();
    if (request.status === 200) {
      return response;
    } else {
      console.error(`\n${request.status} ${response?.errors[0]?.message}.`);
      return null;
    }
  } catch (error) {
    console.error(`\nSomething went wrong. ${(error as Error).message}.`);
    return null;
  }
}

export { fetcher };
