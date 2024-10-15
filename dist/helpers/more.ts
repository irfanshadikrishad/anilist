import fetch from "node-fetch";
import { animeDetailsQuery, userQuery } from "./queries.js";
import { isLoggedIn, retriveAccessToken } from "./auth.js";
import {
  aniListEndpoint,
  formatDateObject,
  getTitle,
  removeHtmlAndMarkdown,
} from "./workers.js";
import { fetcher } from "./fetcher.js";
import { colorize_Anilist, colorize_Brown } from "./colorize.js";

async function getUserInfoByUsername(username: string) {
  try {
    const loggedIn = await isLoggedIn();
    let headers = {
      "content-type": "application/json",
    };
    if (loggedIn) {
      headers["Authorization"] = `Bearer ${await retriveAccessToken()}`;
    }
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query: userQuery, variables: { username } }),
    });
    const response: any = await request.json();
    if (request.status === 200) {
      const user = response?.data?.User;
      console.log(`\nID:\t\t${user?.id}`);
      console.log(`Name:\t\t${user?.name}`);
      console.log(`siteUrl:\t${user?.siteUrl}`);
      console.log(`Donator Tier:\t${user?.donatorTier}`);
      console.log(`Donator Badge:\t${user?.donatorBadge}`);
      {
        user?.createdAt &&
          console.log(
            `Account Created:${new Date(user?.createdAt * 1000).toUTCString()}`
          );
      }
      console.log(
        `Account Updated:${new Date(user?.updatedAt * 1000).toUTCString()}`
      );
      console.log(`I blocked?\t${user?.isBlocked}`);
      console.log(`My follower:\t${user?.isFollower}`);
      console.log(`I'm following:\t${user?.isFollowing}`);
      console.log(`Color:\t${user?.options?.profileColor}`);
      console.log(`Timezone:\t${user?.options?.timezone}`);
      console.log(
        `Statistics (Anime)\nCount: ${user?.statistics?.anime?.count} episodesWatched: ${user?.statistics?.anime?.episodesWatched} minutesWatched: ${user?.statistics?.anime?.minutesWatched}`
      );
      console.log(
        `Statistics (Manga)\nCount: ${user?.statistics?.manga?.count} Chapter Read: ${user?.statistics?.manga?.chaptersRead} Volumes Read: ${user?.statistics?.manga?.volumesRead}`
      );
    } else {
      console.log(`Something went wrong. ${response?.errors[0]?.message}`);
    }
  } catch (error) {
    console.log(`Something went wrong. ${(error as Error).message}`);
  }
}
async function getAnimeDetailsByID(anilistID: number) {
  const loggedIn = await isLoggedIn();
  let query = animeDetailsQuery;
  let variables = { id: anilistID };
  let headers = { "content-type": "application/json" };
  if (loggedIn) {
    headers["Authorization"] = `Bearer ${await retriveAccessToken()}`;
  }
  const details = await fetcher(query, variables, headers);

  if (details) {
    const {
      id,
      idMal,
      title,
      description,
      episodes,
      nextAiringEpisode,
      duration,
      startDate,
      endDate,
      countryOfOrigin,
      isAdult,
      status,
      season,
      format,
      genres,
      siteUrl,
      stats,
    } = details?.data?.Media;
    let titl = colorize_Anilist(title?.userPreffered || getTitle(title));
    let st_tus = colorize_Anilist(String(status));
    let descri = colorize_Brown(removeHtmlAndMarkdown(description));

    console.log(`\nID: ${id}`);
    console.log(`Title: `, titl);
    console.log(`Description: `, descri);
    console.log(`Episode Duration: ${duration}min`);
    console.log(`Origin: ${countryOfOrigin}`);
    console.log(`Status: `, st_tus);
    console.log(`Format: ${format}`);
    console.log(`Genres: ${genres.join(", ")}`);
    console.log(`Season: ${season}`);
    console.log(`Url: `, siteUrl);
    console.log(`isAdult: ${isAdult}`);
    console.log(`Released: ${formatDateObject(startDate)}`);
    console.log(`Finished: ${formatDateObject(endDate)}`);
  }
}

export { getUserInfoByUsername, getAnimeDetailsByID };
