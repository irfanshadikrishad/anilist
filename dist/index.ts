#!/usr/bin/env node
import { Command } from "commander";
import {
  anilistUserLogin,
  currentUserInfo,
  logoutUser,
} from "./helpers/auth.js";
import {
  deleteAnimeCollection,
  deleteMangaCollection,
  getPopular,
  getTrending,
  getUpcomingAnimes,
  loggedInUsersAnimeLists,
  loggedInUsersMangaLists,
} from "./helpers/lists.js";
import {
  getAnimeDetailsByID,
  getAnimeSearchResults,
  getMangaSearchResults,
  deleteUserActivities,
  getUserInfoByUsername,
  writeTextActivity,
} from "./helpers/more.js";

const cli = new Command();

cli
  .name("anilist")
  .description(
    "Minimalist unofficial AniList CLI for Anime and Manga Enthusiasts."
  )
  .version("1.0.4");

cli
  .command("login")
  .description("Login with AniList")
  .requiredOption("-i, --id <number>", null)
  .requiredOption("-s, --secret <string>", null)
  .action(async ({ id, secret }) => {
    if (id && secret) {
      await anilistUserLogin(id, secret);
    } else {
      console.log("\nMust provide both ClientId and ClientSecret!");
    }
  });
cli
  .command("me")
  .description("Get details of the logged in user")
  .action(async () => {
    await currentUserInfo();
  });
cli
  .command("trending")
  .alias("tr")
  .description("Get the trending list from AniList")
  .option("-c, --count <number>", "Number of list items to get", "10")
  .action(async ({ count }) => {
    await getTrending(Number(count));
  });
cli
  .command("popular")
  .alias("plr")
  .description("Get the popular list from AniList")
  .option("-c, --count <number>", "Number of list items to get", "10")
  .action(async ({ count }) => {
    await getPopular(Number(count));
  });
cli
  .command("user <username>")
  .description("Get user information")
  .action(async (username) => {
    await getUserInfoByUsername(username);
  });
cli
  .command("logout")
  .description("Log out the current user.")
  .action(async () => {
    await logoutUser();
  });
cli
  .command("lists")
  .alias("ls")
  .description("Get anime or manga list of authenticated user.")
  .option("-a, --anime", "For anime list of authenticated user", false)
  .option("-m, --manga", "For manga list of authenticated user", false)
  .action(async ({ anime, manga }) => {
    if ((!anime && !manga) || (anime && manga)) {
      console.error(`\nMust select an option, either --anime or --manga`);
    } else if (anime) {
      await loggedInUsersAnimeLists();
    } else if (manga) {
      await loggedInUsersMangaLists();
    }
  });
cli
  .command("delete")
  .alias("del")
  .description("Delete entire collections of anime or manga")
  .option("-a, --anime", "For anime list of authenticated user", false)
  .option("-m, --manga", "For manga list of authenticated user", false)
  .option("-ac, --activity", "For activity of authenticated user", false)
  .action(async ({ anime, manga, activity }) => {
    const selectedOptions = [anime, manga, activity].filter(Boolean).length;
    if (selectedOptions === 0) {
      console.error(
        `\nMust select one option: either --anime, --manga, or --activity`
      );
      process.exit(1);
    }
    if (selectedOptions > 1) {
      console.error(
        `\nOnly one option can be selected at a time: --anime, --manga, or --activity`
      );
      process.exit(1);
    }
    if (anime) {
      await deleteAnimeCollection();
    } else if (manga) {
      await deleteMangaCollection();
    } else if (activity) {
      await deleteUserActivities();
    }
  });
cli
  .command("upcoming")
  .alias("up")
  .description("Anime that will be released in upcoming season")
  .option("-c, --count <number>", "Number of items to get", "10")
  .action(async ({ count }) => {
    await getUpcomingAnimes(Number(count));
  });
cli
  .command("anime <id>")
  .description("Get anime details by their ID")
  .action(async (id) => {
    if (id && !Number.isNaN(Number(id))) {
      await getAnimeDetailsByID(Number(id));
    } else {
      console.error(
        `\nInvalid or missing ID (${id}). Please provide a valid numeric ID.`
      );
    }
  });
cli
  .command("search <query>")
  .alias("srch")
  .alias("find")
  .description("Search anime or manga.")
  .option("-a, --anime", "To get the anime search results.", false)
  .option("-m, --manga", "To get the manga search results.", false)
  .option("-c, --count <number>", "Number of search results to show.", "10")
  .action(async (query, { anime, manga, count }) => {
    if ((!anime && !manga) || (anime && manga)) {
      console.error(`\nMust select an option, either --anime or --manga`);
    } else {
      if (anime) {
        await getAnimeSearchResults(query, Number(count));
      } else if (manga) {
        await getMangaSearchResults(query, Number(count));
      } else {
        console.error(`\nMust select an option, either --anime or --manga`);
      }
    }
  });
cli
  .command("status <status>")
  .alias("post")
  .alias("write")
  .description("Write a status...")
  .action(async (status) => {
    await writeTextActivity(status);
  });

cli.parse(process.argv);
