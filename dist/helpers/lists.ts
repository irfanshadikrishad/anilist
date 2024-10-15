import fetch from "node-fetch";
import inquirer from "inquirer";
import { aniListEndpoint, getNextSeasonAndYear, getTitle } from "./workers.js";
import {
  deleteMangaEntryMutation,
  deleteMediaEntryMutation,
  popularQuery,
  trendingQuery,
  upcomingAnimesQuery,
} from "./queries.js";
import { currentUserAnimeList, currentUserMangaList } from "./queries.js";
import { isLoggedIn, currentUsersId, retriveAccessToken } from "./auth.js";

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

async function loggedInUsersAnimeLists() {
  try {
    const loggedIn = await isLoggedIn();
    if (loggedIn) {
      const userID = await currentUsersId();
      if (userID) {
        const request = await fetch(aniListEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${await retriveAccessToken()}`,
          },
          body: JSON.stringify({
            query: currentUserAnimeList,
            variables: { id: userID },
          }),
        });
        const response: any = await request.json();

        if (request.status === 200) {
          const lists = response?.data?.MediaListCollection?.lists;
          const { selectedList } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedList",
              message: "Select an anime list:",
              choices: lists.map((list: any) => list.name),
            },
          ]);
          const selectedEntries = lists.find(
            (list: any) => list.name === selectedList
          );
          if (selectedEntries) {
            console.log(`\nEntries for '${selectedEntries.name}':`);
            selectedEntries.entries.forEach((entry: any, idx: number) => {
              console.log(`${idx + 1}. ${getTitle(entry?.media?.title)}`);
            });
          } else {
            console.log("No entries found.");
          }
        } else {
          console.log(`Something went wrong. ${response?.errors[0]?.message}`);
        }
      } else {
        console.log(`Failed getting current user Id.`);
      }
    } else {
      console.log(`Please log in first.`);
    }
  } catch (error) {
    console.log(`Something went wrong. ${(error as Error).message}`);
  }
}

async function loggedInUsersMangaLists() {
  try {
    const loggedIn = await isLoggedIn();
    if (loggedIn) {
      const userID = await currentUsersId();
      if (userID) {
        const request = await fetch(aniListEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${await retriveAccessToken()}`,
          },
          body: JSON.stringify({
            query: currentUserMangaList,
            variables: { id: userID },
          }),
        });
        const response: any = await request.json();

        if (request.status === 200) {
          const lists = response?.data?.MediaListCollection?.lists;
          const { selectedList } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedList",
              message: "Select a manga list:",
              choices: lists.map((list: any) => list.name),
            },
          ]);
          const selectedEntries = lists.find(
            (list: any) => list.name === selectedList
          );
          if (selectedEntries) {
            console.log(`\nEntries for '${selectedEntries.name}':`);
            selectedEntries.entries.forEach((entry: any, idx: number) => {
              console.log(`${idx + 1}. ${getTitle(entry?.media?.title)}`);
            });
          } else {
            console.log("No entries found.");
          }
        } else {
          console.log(`Something went wrong. ${response?.errors[0]?.message}`);
        }
      } else {
        console.log(`Failed getting current user Id.`);
      }
    } else {
      console.log(`Please log in first.`);
    }
  } catch (error) {
    console.log(`Something went wrong. ${(error as Error).message}`);
  }
}
async function deleteAnimeCollection() {
  const loggedIn = await isLoggedIn();
  if (loggedIn) {
    const userID = await currentUsersId();
    if (userID) {
      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await retriveAccessToken()}`,
        },
        body: JSON.stringify({
          query: currentUserAnimeList,
          variables: { id: userID },
        }),
      });
      const response: any = await request.json();

      if (request.status === 200) {
        const lists = response?.data?.MediaListCollection?.lists;
        const { selectedList } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedList",
            message: "Select an anime list:",
            choices: lists.map((list: any) => list.name),
          },
        ]);
        const selectedEntries = lists.find(
          (list: any) => list.name === selectedList
        );
        if (selectedEntries) {
          console.log(`\nDeleting entries of '${selectedEntries.name}':`);

          for (const [idx, entry] of selectedEntries.entries.entries()) {
            if (entry?.id) {
              await deleteAnimeByAnimeId(entry?.id, entry?.media?.title);
              await new Promise((resolve) => setTimeout(resolve, 2000));
            } else {
              console.log(`No id in entry.`);
              console.log(entry);
            }
          }
        } else {
          console.log("No entries found.");
        }
      } else {
        console.log(`Something went wrong. ${response?.errors[0]?.message}`);
      }
    } else {
      console.log(`Failed getting current user Id.`);
    }
  } else {
    console.log(`Please log in first.`);
  }
}

async function deleteAnimeByAnimeId(id: number, title?: any) {
  try {
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await retriveAccessToken()}`,
      },
      body: JSON.stringify({
        query: deleteMediaEntryMutation,
        variables: { id },
      }),
    });
    const response: any = await request.json();
    if (request.status === 200) {
      const deleted = response?.data?.DeleteMediaListEntry?.deleted;
      console.log(
        `del ${title ? getTitle(title) : ""} ${deleted ? "✅" : "❌"}`
      );
    } else {
      console.log(`Error deleting anime. ${response?.errors[0]?.message}`);
      console.log(response);
    }
  } catch (error) {
    console.log(`Error deleting anime. ${id} ${(error as Error).message}`);
  }
}

async function deleteMangaCollection() {
  const loggedIn = await isLoggedIn();
  if (loggedIn) {
    const userID = await currentUsersId();
    if (userID) {
      const request = await fetch(aniListEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await retriveAccessToken()}`,
        },
        body: JSON.stringify({
          query: currentUserMangaList,
          variables: { id: userID },
        }),
      });
      const response: any = await request.json();

      if (request.status === 200) {
        const lists = response?.data?.MediaListCollection?.lists;
        const { selectedList } = await inquirer.prompt([
          {
            type: "list",
            name: "selectedList",
            message: "Select a manga list:",
            choices: lists.map((list: any) => list.name),
          },
        ]);
        const selectedEntries = lists.find(
          (list: any) => list.name === selectedList
        );
        if (selectedEntries) {
          console.log(`\nDeleting entries of '${selectedEntries.name}':`);

          for (const [idx, entry] of selectedEntries.entries.entries()) {
            if (entry?.id) {
              await deleteMangaByMangaId(entry?.id, entry?.media?.title);
              await new Promise((resolve) => setTimeout(resolve, 2000));
            } else {
              console.log(`No id in entry.`);
              console.log(entry);
            }
          }
        } else {
          console.log("No entries found.");
        }
      } else {
        console.log(`Something went wrong. ${response?.errors[0]?.message}`);
      }
    } else {
      console.log(`Failed getting current user Id.`);
    }
  } else {
    console.log(`Please log in first.`);
  }
}
async function deleteMangaByMangaId(id: number, title?: any) {
  try {
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${await retriveAccessToken()}`,
      },
      body: JSON.stringify({
        query: deleteMangaEntryMutation,
        variables: { id },
      }),
    });
    const response: any = await request.json();
    if (request.status === 200) {
      const deleted = response?.data?.DeleteMediaListEntry?.deleted;
      console.log(
        `del ${title ? getTitle(title) : ""} ${deleted ? "✅" : "❌"}`
      );
    } else {
      console.log(`Error deleting manga. ${response?.errors[0]?.message}`);
      console.log(response);
    }
  } catch (error) {
    console.log(`Error deleting manga. ${id} ${(error as Error).message}`);
  }
}
async function getUpcomingAnimes(count: number) {
  try {
    const { nextSeason, nextYear } = getNextSeasonAndYear();
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
      body: JSON.stringify({
        query: upcomingAnimesQuery,
        variables: { nextSeason, nextYear, perPage: count },
      }),
    });
    const response: any = await request.json();
    if (request.status === 200) {
      const upcoming = response?.data?.Page?.media ?? [];
      console.log("");
      upcoming.forEach(({ id, title, startDate, genres }, idx: number) => {
        const titleName = title?.userPreffered || getTitle(title);
        const formattedDate = `${startDate?.day ? `${startDate?.day}/` : ""}${
          startDate?.month
        }/${startDate?.year}`;

        console.log(
          `[${idx + 1}] ${titleName}\n\t${formattedDate} • ${genres.join(", ")}`
        );
      });
    } else {
      console.error(`Something went wrong. ${response?.errors[0]?.message}`);
    }
  } catch (error) {
    console.error(`Error getting upcoming animes. ${(error as Error).message}`);
  }
}

export {
  getTrending,
  getPopular,
  getUpcomingAnimes,
  loggedInUsersAnimeLists,
  loggedInUsersMangaLists,
  deleteAnimeCollection,
  deleteMangaCollection,
};
