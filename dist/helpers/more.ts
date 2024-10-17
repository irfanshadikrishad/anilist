import fetch from "node-fetch";
import {
  activityAllQuery,
  activityAnimeListQuery,
  activityMangaListQuery,
  activityMediaList,
  activityMessageQuery,
  activityTextQuery,
  animeDetailsQuery,
  animeSearchQuery,
  mangaSearchQuery,
  userActivityQuery,
  userQuery,
} from "./queries.js";
import { currentUsersId, isLoggedIn, retriveAccessToken } from "./auth.js";
import {
  aniListEndpoint,
  formatDateObject,
  getTitle,
  removeHtmlAndMarkdown,
} from "./workers.js";
import { fetcher } from "./fetcher.js";
import inquirer from "inquirer";
import {
  addAnimeToListMutation,
  addMangaToListMutation,
  deleteActivityMutation,
  saveTextActivityMutation,
} from "./mutations.js";

async function getUserInfoByUsername(username: string) {
  try {
    const loggedIn = await isLoggedIn();
    let headers = {
      "content-type": "application/json",
    };
    if (loggedIn) {
      headers["Authorization"] = `Bearer ${await retriveAccessToken()}`;
    }
    const request: any = await fetch(aniListEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query: userQuery, variables: { username } }),
    });
    const response: any = await request.json();
    if (request.status === 200) {
      const user: any = response?.data?.User;
      const responseUserActivity: any = await fetcher(userActivityQuery, {
        id: user?.id,
        page: 1,
        perPage: 10,
      });
      const activities = responseUserActivity?.data?.Page?.activities || [];

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
        `\nStatistics (Anime)\nCount: ${user?.statistics?.anime?.count} episodesWatched: ${user?.statistics?.anime?.episodesWatched} minutesWatched: ${user?.statistics?.anime?.minutesWatched}`
      );
      console.log(
        `Statistics (Manga)\nCount: ${user?.statistics?.manga?.count} Chapter Read: ${user?.statistics?.manga?.chaptersRead} Volumes Read: ${user?.statistics?.manga?.volumesRead}`
      );
      console.log(`\nRecent Activities:`);
      activities.length > 0 &&
        activities.map(
          ({ id, status, progress, createdAt, media }, idx: number) => {
            progress
              ? console.log(
                  `${status} ${progress} of ${getTitle(media?.title)}`
                )
              : console.log(`${status} ${getTitle(media?.title)}`);
          }
        );
    } else {
      console.error(`\n${request.status} ${response?.errors[0]?.message}`);
    }
  } catch (error) {
    console.error(`\nSomething went wrong. ${(error as Error).message}`);
  }
}
async function getAnimeDetailsByID(anilistID: number) {
  let query = animeDetailsQuery;
  let variables = { id: anilistID };
  const details: any = await fetcher(query, variables);

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

    console.log(`\nID: ${id}`);
    console.log(`Title: ${title?.userPreffered || getTitle(title)}`);
    console.log(`Description: ${removeHtmlAndMarkdown(description)}`);
    console.log(`Episode Duration: ${duration}min`);
    console.log(`Origin: ${countryOfOrigin}`);
    console.log(`Status: ${String(status)}`);
    console.log(`Format: ${format}`);
    console.log(`Genres: ${genres.join(", ")}`);
    console.log(`Season: ${season}`);
    console.log(`Url: `, siteUrl);
    console.log(`isAdult: ${isAdult}`);
    console.log(`Released: ${formatDateObject(startDate)}`);
    console.log(`Finished: ${formatDateObject(endDate)}`);
  }
}
async function getAnimeSearchResults(search: string, count: number) {
  const query = animeSearchQuery;
  const variables = { search, page: 1, perPage: count };

  const searchResults: any = await fetcher(query, variables);

  if (searchResults) {
    const results = searchResults?.data?.Page?.media;
    if (results.length > 0) {
      const { selectedList } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedList",
          message: "Select anime to add to your list:",
          choices: results.map((res: any, idx: number) => ({
            name: `[${idx + 1}] ${getTitle(res?.title)}`,
            value: res?.id,
          })),
          pageSize: 10,
        },
      ]);
      // Where to save
      const { selectedListType } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedListType",
          message: "Select the list where you want to save this anime:",
          choices: [
            { name: "Planning", value: "PLANNING" },
            { name: "Watching", value: "CURRENT" },
            { name: "Completed", value: "COMPLETED" },
            { name: "Paused", value: "PAUSED" },
            { name: "Dropped", value: "DROPPED" },
          ],
        },
      ]);
      // Lets save to the list now
      const ISLOGGEDIN = await isLoggedIn();
      if (ISLOGGEDIN) {
        const query = addAnimeToListMutation;
        const variables = { mediaId: selectedList, status: selectedListType };

        const response: any = await fetcher(query, variables);

        if (response) {
          const saved = response?.data?.SaveMediaListEntry;
          console.log(`\nEntry ${saved?.id}. Saved as ${saved?.status}.`);
        }
      } else {
        console.error(`\nPlease log in first to use this feature.`);
      }
    } else {
      console.log(`\nNo search results!`);
    }
  } else {
    console.error(`\nSomething went wrong.`);
  }
}

async function getMangaSearchResults(search: string, count: number) {
  const query = mangaSearchQuery;
  const variables = { search, page: 1, perPage: count };

  const mangaSearchResult: any = await fetcher(query, variables);

  if (mangaSearchResult) {
    const results = mangaSearchResult?.data?.Page?.media;
    // List of manga search results
    const { selectedMangaId } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedMangaId",
        message: "Select manga to add to your list:",
        choices: results.map((res: any, idx: number) => ({
          name: `[${idx + 1}] ${getTitle(res?.title)}`,
          value: res?.id,
        })),
        pageSize: 10,
      },
    ]);
    // Options to save to the list
    const { selectedListType } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedListType",
        message: "Select the list where you want to save this manga:",
        choices: [
          { name: "Planning", value: "PLANNING" },
          { name: "Reading", value: "CURRENT" },
          { name: "Completed", value: "COMPLETED" },
          { name: "Paused", value: "PAUSED" },
          { name: "Dropped", value: "DROPPED" },
        ],
      },
    ]);

    // If logged in save to the list
    const ISLOGGEDIN = await isLoggedIn();
    if (ISLOGGEDIN) {
      const mutation = addMangaToListMutation;
      const variables = { mediaId: selectedMangaId, status: selectedListType };
      const response: any = await fetcher(mutation, variables);

      if (response) {
        const saved = response?.data?.SaveMediaListEntry;
        console.log(`\nEntry ${saved?.id}. Saved as ${saved?.status}.`);
      }
    } else {
      console.error(`\nPlease log in first to use this feature.`);
    }
  } else {
    console.error(`\nSomething went wrong.`);
  }
}
async function deleteUserActivities() {
  const LOGGEDIN = await isLoggedIn();
  if (LOGGEDIN) {
    const { activityType } = await inquirer.prompt([
      {
        type: "list",
        name: "activityType",
        message: "What type of activity you want to delete?",
        choices: [
          { name: "All Activity", value: 0 },
          { name: "Text Activity", value: 1 },
          { name: "Media List Activity", value: 2 },
          { name: "Anime List Activity", value: 3 },
          { name: "Manga List Activity", value: 4 },
          { name: "Message Activity", value: 5 },
        ],
      },
    ]);
    let query = ``;
    const userId = await currentUsersId();
    let variables = { page: 1, perPage: 100, userId };
    switch (activityType) {
      case 0:
        query = activityAllQuery;
        break;
      case 1:
        query = activityTextQuery;
        break;
      case 2:
        query = activityMediaList;
        break;
      case 3:
        query = activityAnimeListQuery;
        break;
      case 4:
        query = activityMangaListQuery;
        break;
      case 5:
        query = activityMessageQuery;
        break;
    }
    const response: any = await fetcher(query, variables);

    if (response) {
      const activities = response?.data?.Page?.activities;
      if (activities.length <= 0) {
        console.log(`\nNo activities available of this type.`);
      } else {
        for (let act of activities) {
          // Making sure to have ID
          // to avoid unintended errors
          if (act?.id) {
            const activityID = act?.id;
            const deleteResponse: any = await fetcher(deleteActivityMutation, {
              id: activityID,
            });
            const isDeleted = deleteResponse?.data?.DeleteActivity?.deleted;

            console.log(`${activityID} ${isDeleted ? "✅" : "❌"}`);

            // avoiding rate-limit
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }
    }
  } else {
    console.error(`\nPlease log in to delete your activities.`);
  }
}

async function writeTextActivity(status: string) {
  try {
    if (await isLoggedIn()) {
      const query = saveTextActivityMutation;
      const addTagInStatus: string =
        status +
        `<br><br><br><br>*Written using [@irfanshadikrishad/anilist](https://www.npmjs.com/package/@irfanshadikrishad/anilist).*`;
      const variables = { status: addTagInStatus };

      const data: any = await fetcher(query, variables);

      if (data) {
        const savedActivity = data?.data?.SaveTextActivity;

        if (savedActivity?.id) {
          console.log(`\n[${savedActivity?.id}] status saved successfully!`);
        }
      } else {
        console.error(`\nSomething went wrong. ${data}.`);
      }
    } else {
      console.error(`\nPlease login to use this feature.`);
    }
  } catch (error) {
    console.error(`\n${(error as Error).message}`);
  }
}

export {
  getUserInfoByUsername,
  getAnimeDetailsByID,
  getAnimeSearchResults,
  getMangaSearchResults,
  deleteUserActivities,
  writeTextActivity,
};
