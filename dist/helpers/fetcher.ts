import fetch from "node-fetch";
import { aniListEndpoint } from "./workers.js";

async function fetcher(query: string, variables: object, headers: HeadersInit) {
  try {
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
