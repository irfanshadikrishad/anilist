#!/usr/bin/env node
import { Command } from "commander"
import process from "process"
import { Auth, Social } from "./helpers/auth.js"
import { AniList } from "./helpers/lists.js"
import { getCurrentPackageVersion } from "./helpers/workers.js"

const cli = new Command()

cli
  .name("anilist")
  .description(
    "Minimalist unofficial AniList CLI for Anime and Manga Enthusiasts."
  )
  .version(getCurrentPackageVersion())
cli
  .command("login")
  .description("Login with AniList")
  .requiredOption("-i, --id <number>", null)
  .requiredOption("-s, --secret <string>", null)
  .action(async ({ id, secret }) => {
    if (id && secret) {
      await Auth.Login(id, secret)
    } else {
      console.log("\nMust provide both ClientId and ClientSecret!")
    }
  })
cli
  .command("whoami")
  .description("Get details of the logged in user")
  .action(async () => {
    await Auth.Myself()
  })
cli
  .command("trending")
  .alias("tr")
  .description("Get the trending list from AniList")
  .option("-c, --count <number>", "Number of list items to get", "10")
  .action(async ({ count }) => {
    await AniList.getTrendingAnime(Number(count))
  })
cli
  .command("popular")
  .alias("plr")
  .description("Get the popular list from AniList")
  .option("-c, --count <number>", "Number of list items to get", "10")
  .action(async ({ count }) => {
    await AniList.getPopularAnime(Number(count))
  })
cli
  .command("user <username>")
  .description("Get user information")
  .action(async (username) => {
    await AniList.getUserByUsername(username)
  })
cli
  .command("logout")
  .description("Log out the current user.")
  .action(async () => {
    await Auth.Logout()
  })
cli
  .command("lists")
  .alias("ls")
  .description("Get anime or manga list of authenticated user.")
  .option("-a, --anime", "For anime list of authenticated user", false)
  .option("-m, --manga", "For manga list of authenticated user", false)
  .action(async ({ anime, manga }) => {
    if ((!anime && !manga) || (anime && manga)) {
      console.error(`\nMust select an option, either --anime or --manga`)
    } else if (anime) {
      await AniList.MyAnime()
    } else if (manga) {
      await AniList.MyManga()
    }
  })
cli
  .command("delete")
  .alias("del")
  .description("Delete entire collections of anime or manga")
  .option("-a, --anime", "For anime list of authenticated user", false)
  .option("-m, --manga", "For manga list of authenticated user", false)
  .option("-s, --activity", "For activity of authenticated user", false)
  .action(async ({ anime, manga, activity }) => {
    const selectedOptions = [anime, manga, activity].filter(Boolean).length
    if (selectedOptions === 0) {
      console.error(
        `\nMust select one option: either --anime, --manga, or --activity`
      )
      process.exit(1)
    }
    if (selectedOptions > 1) {
      console.error(
        `\nOnly one option can be selected at a time: --anime, --manga, or --activity`
      )
      process.exit(1)
    }
    if (anime) {
      await Auth.DeleteMyAnimeList()
    } else if (manga) {
      await Auth.DeleteMyMangaList()
    } else if (activity) {
      await Auth.DeleteMyActivities()
    }
  })
cli
  .command("upcoming")
  .alias("up")
  .description("Anime that will be released in upcoming season")
  .option("-c, --count <number>", "Number of items to get", "10")
  .action(async ({ count }) => {
    await AniList.getUpcomingAnime(Number(count))
  })
cli
  .command("anime <id>")
  .description("Get anime details by their ID")
  .action(async (id) => {
    if (id && !Number.isNaN(Number(id))) {
      await AniList.getAnimeDetailsByID(Number(id))
    } else {
      console.error(
        `\nInvalid or missing ID (${id}). Please provide a valid numeric ID.`
      )
    }
  })
cli
  .command("manga <id>")
  .description("Get manga details by their ID")
  .option("-c, --count <number>", "Number of items to get", "10")
  .action(async (id) => {
       await AniList.getMangaDetailsByID(id)
  })
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
      console.error(`\nMust select an option, either --anime or --manga`)
    } else {
      if (anime) {
        await AniList.searchAnime(query, Number(count))
      } else if (manga) {
        await AniList.searchManga(query, Number(count))
      } else {
        console.error(`\nMust select an option, either --anime or --manga`)
      }
    }
  })
cli
  .command("status <status>")
  .alias("post")
  .alias("write")
  .description("Write a status...")
  .action(async (status) => {
    await Auth.Write(status)
  })
cli
  .command("export")
  .alias("exp")
  .description("Export your anime or manga list.")
  .option("-a, --anime", "To get the anime search results.", false)
  .option("-m, --manga", "To get the manga search results.", false)
  .action(async ({ anime, manga }) => {
    if ((!anime && !manga) || (anime && manga)) {
      console.error(`\nMust select an option, either --anime or --manga`)
    } else {
      if (anime) {
        await AniList.exportAnime()
      } else if (manga) {
        await AniList.exportManga()
      }
    }
  })
cli
  .command("import")
  .alias("imp")
  .description("Import your anime or manga from anilist or other sources.")
  .option("-a, --anime", "To get the anime search results.", false)
  .option("-m, --manga", "To get the manga search results.", false)
  .action(async ({ anime, manga }) => {
    if ((!anime && !manga) || (anime && manga)) {
      console.error(`\nMust select an option, either --anime or --manga`)
    } else {
      if (await Auth.isLoggedIn()) {
        if (anime) {
          await Auth.callAnimeImporter()
        } else if (manga) {
          await Auth.callMangaImporter()
        }
      } else {
        console.error(`\nPlease login to use this feature.`)
      }
    }
  })
cli
  .command("social")
  .alias("sol")
  .description("Automate your process")
  .option("-f, --follow", "Follow the user whos following you.", false)
  .option("-u, --unfollow", "Unfollow the user whos not following you.", false)
  .action(async ({ follow, unfollow }) => {
    if (!follow && !unfollow) {
      console.error(`\nMust select an option, either --follow or --unfollow`)
    } else {
      if (await Auth.isLoggedIn()) {
        if (follow) {
          await Social.follow()
        } else if (unfollow) {
          await Social.unfollow()
        }
      } else {
        console.error(`\nPlease login to use this feature.`)
      }
    }
  })

cli.parse(process.argv)
