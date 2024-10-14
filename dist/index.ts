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
import { getUserInfoByUsername } from "./helpers/more.js";

const cli = new Command();

cli.name("anilist").description("Unofficial AniList CLI").version("1.0.0");

cli
  .command("login")
  .description("Login with AniList")
  .requiredOption("-i, --id <number>", null)
  .requiredOption("-s, --secret <string>", null)
  .action(async ({ id, secret }) => {
    if (id && secret) {
      await anilistUserLogin(id, secret);
    } else {
      console.log("Tokens not provided correctly!");
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
  .command("user")
  .description("Get user information")
  .requiredOption("-un, --username <string>", "null")
  .action(async ({ username }) => {
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
      console.log(`Must select an option, either --anime or --manga`);
    } else if (anime) {
      await loggedInUsersAnimeLists();
    } else if (manga) {
      await loggedInUsersMangaLists();
    }
  });
cli
  .command("delete")
  .alias("del")
  .description("Delete entire collections of anime or mang")
  .option("-a, --anime", "For anime list of authenticated user", false)
  .option("-m, --manga", "For manga list of authenticated user", false)
  .action(async ({ anime, manga }) => {
    if ((!anime && !manga) || (anime && manga)) {
      console.log(`Must select an option, either --anime or --manga`);
    } else if (anime) {
      await deleteAnimeCollection();
    } else if (manga) {
      await deleteMangaCollection();
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

cli.parse(process.argv);
