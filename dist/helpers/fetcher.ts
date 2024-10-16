import fetch from "node-fetch";
import { aniListEndpoint } from "./workers.js";
import { isLoggedIn, retriveAccessToken } from "./auth.js";

async function fetcher(query: string, variables: object) {
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
      console.error(`Error from fetcher. ${response?.errors[0]?.message}.`);
      return null;
    }
  } catch (error) {
    console.error(`Something went wrong. ${(error as Error).message}.`);
    return null;
  }
}

export { fetcher };
