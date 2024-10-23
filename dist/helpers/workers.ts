import { XMLParser } from "fast-xml-parser"
import fs from "fs"
import { readdir, readFile, writeFile } from "fs/promises"
import inquirer from "inquirer"
import { parse } from "json2csv"
import open from "open"
import { homedir } from "os"
import { join } from "path"
import process from "process"
import { currentUsersName } from "./auth.js"
import { fetcher } from "./fetcher.js"
import {
  saveAnimeWithProgressMutation,
  saveMangaWithProgressMutation,
} from "./mutations.js"
import { malIdToAnilistAnimeId } from "./queries.js"
import {
  AniListMediaStatus,
  MALAnimeXML,
  MalIdToAnilistIdResponse,
  saveAnimeWithProgressResponse,
} from "./types.js"

const aniListEndpoint = `https://graphql.anilist.co`
const redirectUri = "https://anilist.co/api/v2/oauth/pin"

function getTitle(title: { english?: string; romaji?: string }) {
  return title?.english || title?.romaji || "???"
}

function formatDateObject(
  dateObj: { day?: string; month?: string; year?: string } | null
) {
  if (!dateObj) return "null"
  return (
    [dateObj.day, dateObj.month, dateObj.year].filter(Boolean).join("/") ||
    "null"
  )
}

function getNextSeasonAndYear() {
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  let nextSeason: string
  let nextYear: number

  // Determine the current season
  if (currentMonth >= 12 || currentMonth <= 2) {
    nextSeason = "SPRING"
    nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
  } else if (currentMonth >= 3 && currentMonth <= 5) {
    nextSeason = "SUMMER"
    nextYear = currentYear
  } else if (currentMonth >= 6 && currentMonth <= 8) {
    nextSeason = "FALL"
    nextYear = currentYear
  } else if (currentMonth >= 9 && currentMonth <= 11) {
    nextSeason = "WINTER"
    nextYear = currentYear + 1
  }

  return { nextSeason, nextYear }
}

function removeHtmlAndMarkdown(input: string) {
  if (input) {
    input = input.replace(/<\/?[^>]+(>|$)/g, "")
    input = input.replace(/(^|\n)#{1,6}\s+(.+?)(\n|$)/g, "$2 ")
    input = input.replace(/(\*\*|__)(.*?)\1/g, "$2")
    input = input.replace(/(\*|_)(.*?)\1/g, "$2")
    input = input.replace(/`(.+?)`/g, "$1")
    input = input.replace(/\[(.*?)\]\(.*?\)/g, "$1")
    input = input.replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    input = input.replace(/(^|\n)>\s+(.+?)(\n|$)/g, "$2 ")
    input = input.replace(/(^|\n)-\s+(.+?)(\n|$)/g, "$2 ")
    input = input.replace(/(^|\n)\d+\.\s+(.+?)(\n|$)/g, "$2 ")
    input = input.replace(/(^|\n)\s*([-*_]){3,}\s*(\n|$)/g, "$1")
    input = input.replace(/~~(.*?)~~/g, "$1")
    input = input.replace(/\s+/g, " ").trim()
  }
  return input
}
function getDownloadFolderPath(): string {
  const homeDirectory = homedir()

  // Determine the Downloads folder path based on the platform
  if (process.platform === "win32") {
    return join(homeDirectory, "Downloads")
  } else if (process.platform === "darwin" || process.platform === "linux") {
    return join(homeDirectory, "Downloads")
  }

  return homeDirectory
}

function getFormattedDate(): string {
  const date = new Date()

  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()

  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  // Format as DD-MM-YYYY-HH-MM
  return `${day}-${month}-${year}-${hours}-${minutes}`
}

/**
 * Export JSON as JSON
 * @param js0n
 * @param dataType (eg: anime/manga)
 */
async function saveJSONasJSON(js0n: object, dataType: string): Promise<void> {
  try {
    const jsonData = JSON.stringify(js0n, null, 2)
    const path = join(
      getDownloadFolderPath(),
      `${await currentUsersName()}@irfanshadikrishad-anilist-${dataType}-${getFormattedDate()}.json`
    )
    await writeFile(path, jsonData, "utf8")
    console.log(`\nSaved as JSON successfully.`)
    open(getDownloadFolderPath())
  } catch (error) {
    console.error("\nError saving JSON data:", error)
  }
}

/**
 * Export JSON as CSV
 * @param js0n
 * @param dataType (eg: anime/manga)
 */
async function saveJSONasCSV(js0n: object, dataType: string): Promise<void> {
  try {
    const csvData = parse(js0n)
    const path = join(
      getDownloadFolderPath(),
      `${await currentUsersName()}@irfanshadikrishad-anilist-${dataType}-${getFormattedDate()}.csv`
    )
    await writeFile(path, csvData, "utf8")
    console.log(`\nSaved as CSV successfully.`)
    open(getDownloadFolderPath())
  } catch (error) {
    console.error("\nError saving CSV data:", error)
  }
}
async function listFilesInDownloadFolder(): Promise<string[]> {
  const downloadFolderPath = getDownloadFolderPath()
  const files = await readdir(downloadFolderPath)
  return files
}
async function selectFile(fileType: string): Promise<string> {
  try {
    const files = await listFilesInDownloadFolder()

    // Filter to include only files, not directories, with the specified extension
    const onlyFiles = files.filter((file) => {
      const filePath = `./downloads/${file}` // Adjust this to the correct path
      const isFile = fs.lstatSync(filePath).isFile() // Check if it's a file
      return isFile && file.endsWith(fileType)
    })

    if (onlyFiles.length > 0) {
      const answers = await inquirer.prompt([
        {
          type: "list",
          name: "fileName",
          message: "Select a file to import:",
          choices: onlyFiles,
        },
      ])

      return answers.fileName
    } else {
      throw new Error(
        `\nNo importable ${fileType} file(s) found in download folder.`
      )
    }
  } catch (error) {
    console.error("\nError selecting file:", error)
    throw error
  }
}
async function importAnimeListFromExportedJSON() {
  try {
    const filename = await selectFile(".json")
    const filePath = join(getDownloadFolderPath(), filename)
    const fileContent = await readFile(filePath, "utf8")
    const importedData = JSON.parse(fileContent)

    let count = 0
    const batchSize = 1 // Number of requests in each batch
    const delay = 2000 // delay to avoid rate-limiting

    for (let i = 0; i < importedData.length; i += batchSize) {
      const batch = importedData.slice(i, i + batchSize)

      await Promise.all(
        batch.map(
          async (anime: { id: number; progress: number; status: string }) => {
            const query = saveAnimeWithProgressMutation
            const variables = {
              mediaId: anime?.id,
              progress: anime?.progress,
              status: anime?.status,
              hiddenFromStatusLists: false,
            }

            try {
              const save: {
                data?: { SaveMediaListEntry: { id: number } }
                errors?: { message: string }
              } = await fetcher(query, variables)
              if (save) {
                const id = save?.data?.SaveMediaListEntry?.id
                count++
                console.log(`[${count}] ${anime?.id}-${id} ✅`)
              } else {
                console.error(`\nError saving ${anime?.id}`)
              }
            } catch (error) {
              console.error(
                `\nError saving ${anime?.id}: ${(error as Error).message}`
              )
            }
          }
        )
      )

      // Avoid rate-limiting: Wait before sending the next batch
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    console.log(`\nTotal ${count} anime(s) imported successfully.`)
  } catch (error) {
    console.error(`\n${(error as Error).message}`)
  }
}

async function importMangaListFromExportedJSON() {
  try {
    const filename = await selectFile(".json")
    const filePath = join(getDownloadFolderPath(), filename)
    const fileContent = await readFile(filePath, "utf8")
    const importedData = JSON.parse(fileContent)

    let count = 0
    const batchSize = 1 // Adjust batch size as per rate-limit constraints
    const delay = 2000 // 2 seconds delay to avoid rate-limit

    // Process in batches
    for (let i = 0; i < importedData.length; i += batchSize) {
      const batch = importedData.slice(i, i + batchSize)

      await Promise.all(
        batch.map(
          async (manga: {
            id: number
            progress: number
            status: string
            private: boolean
          }) => {
            const query = saveMangaWithProgressMutation
            const variables = {
              mediaId: manga?.id,
              progress: manga?.progress,
              status: manga?.status,
              hiddenFromStatusLists: false,
              private: manga?.private,
            }

            try {
              const save: {
                data?: { SaveMediaListEntry: { id: number } }
                errors?: { message: string }
              } = await fetcher(query, variables)
              if (save) {
                const id = save?.data?.SaveMediaListEntry?.id
                count++
                console.log(`[${count}] ${manga?.id}-${id} ✅`)
              }
            } catch (err) {
              console.error(
                `\nError saving ${manga?.id}: ${(err as Error).message}`
              )
            }
          }
        )
      )

      // Avoid rate-limit by adding delay after processing each batch
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    console.log(`\nTotal ${count} manga(s) imported successfully.`)
  } catch (error) {
    console.error(`\nError: ${(error as Error).message}`)
  }
}

class MALimport {
  static async Anime() {
    try {
      const filename = await selectFile(".xml")
      const filePath = join(getDownloadFolderPath(), filename)
      const fileContent = await readFile(filePath, "utf8")
      const parser = new XMLParser()
      if (fileContent) {
        const XMLObject = parser.parse(fileContent)
        if (XMLObject.myanimelist.anime.length > 0) {
          let count = 0
          const animes: MALAnimeXML[] = XMLObject.myanimelist.anime
          for (let anime of animes) {
            const malId = anime.series_animedb_id
            const progress = anime.my_watched_episodes
            const statusMap = {
              "On-Hold": AniListMediaStatus.PAUSED,
              Dropped: AniListMediaStatus.DROPPED,
              Completed: AniListMediaStatus.COMPLETED,
              Watching: AniListMediaStatus.CURRENT,
              "Plan to Watch": AniListMediaStatus.PLANNING,
            }
            const status = statusMap[anime.my_status]

            const anilist: MalIdToAnilistIdResponse = await fetcher(
              malIdToAnilistAnimeId,
              { malId }
            )
            if (anilist.data.Media.id) {
              const id = anilist.data.Media.id
              const saveAnime: saveAnimeWithProgressResponse = await fetcher(
                saveAnimeWithProgressMutation,
                {
                  mediaId: id,
                  progress: progress,
                  status: status,
                  hiddenFromStatusLists: false,
                  private: false,
                }
              )
              if (saveAnime) {
                const entryId = saveAnime?.data?.SaveMediaListEntry?.id
                count++
                console.log(`[${count}] ${entryId} ✅`)

                // rate-limit
                await new Promise((resolve) => {
                  setTimeout(resolve, 1100)
                })
              }
            } else {
              console.error(`could not get anilistId for ${malId}`)
            }
          }
        } else {
          console.log(`\nNo anime list seems to be found.`)
        }
      }
    } catch (error) {
      console.error(`\nError from MALimport. ${(error as Error).message}`)
    }
  }
}

export {
  aniListEndpoint,
  formatDateObject,
  getNextSeasonAndYear,
  getTitle,
  importAnimeListFromExportedJSON,
  importMangaListFromExportedJSON,
  MALimport,
  redirectUri,
  removeHtmlAndMarkdown,
  saveJSONasCSV,
  saveJSONasJSON,
}
