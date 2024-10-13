import fetch from "node-fetch";
import { aniListEndpoint, getTitle } from "./workers.js";
import { popularQuery, trendingQuery } from "./queries.js";

async function getTrending(count: number) {
  try {
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: trendingQuery,
        variables: { page: 1, perPage: count },
      }),
    });
    const response: any = await request.json();
    if (request.status === 200) {
      const media = response?.data?.Page?.media;
      if (media?.length > 0) {
        media.map(
          (
            tr: { id: number; title: { english?: string; romaji?: string } },
            idx: number
          ) => {
            console.log(`${idx + 1}\t${getTitle(tr?.title)}`);
          }
        );
      }
    } else {
      console.log(`Something went wrong. ${response?.errors[0]?.message}`);
    }
  } catch (error) {
    console.log(`Something went wrong. ${(error as Error).message}`);
  }
}
async function getPopular(count: number) {
  try {
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: popularQuery,
        variables: { page: 1, perPage: count },
      }),
    });
    const response: any = await request.json();
    if (request.status === 200) {
      const media = response?.data?.Page?.media;
      if (media?.length > 0) {
        media.map(
          (
            tr: { id: number; title: { english?: string; romaji?: string } },
            idx: number
          ) => {
            console.log(`${idx + 1}\t${getTitle(tr?.title)}`);
          }
        );
      }
    } else {
      console.log(`Something went wrong. ${response?.errors[0]?.message}`);
    }
  } catch (error) {
    console.log(`Something went wrong. ${(error as Error).message}`);
  }
}

export { getTrending, getPopular };
