import fetch from "node-fetch";
import { aniListEndpoint } from "./workers.js";
import { userQuery } from "./queries.js";
import { isLoggedIn, retriveAccessToken } from "./auth.js";

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
            `Account Created:\t${new Date(
              user?.createdAt * 1000
            ).toUTCString()}`
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

export { getUserInfoByUsername };
