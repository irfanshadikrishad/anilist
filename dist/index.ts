#!/usr/bin/env node
import { Command } from "commander";
import { anilistUserLogin, currentUserInfo } from "./helpers/auth.js";
import { getPopular, getTrending } from "./helpers/lists.js";

const cli = new Command();

cli
  .name("anilist")
  .description("Unofficial AniList CLI")
  .version("1.0.0-beta.0");

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

cli.parse(process.argv);
const options = cli.opts();
