import fs from "fs"
import { readdir, writeFile } from "fs/promises"
import inquirer from "inquirer"
import { parse } from "json2csv"
import open from "open"
import { homedir } from "os"
import { join } from "path"
import process from "process"
import { Auth } from "./auth.js"
import { MALAnimeStatus, MALMangaStatus, MediaWithProgress } from "./types.js"

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
      `${await Auth.MyUserName()}@irfanshadikrishad-anilist-${dataType}-${getFormattedDate()}.json`
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
      `${await Auth.MyUserName()}@irfanshadikrishad-anilist-${dataType}-${getFormattedDate()}.csv`
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

function createAnimeXML(
  malId: number,
  progress: number,
  status: MALAnimeStatus,
  episodes: number,
  title: string
): string {
  return `
    <anime>
      <series_animedb_id>${malId}</series_animedb_id>
      <series_title><![CDATA[${title}]]></series_title>
      <series_type>""</series_type>
      <series_episodes>${episodes}</series_episodes>
      <my_id>0</my_id>
      <my_watched_episodes>${progress}</my_watched_episodes>
      <my_start_date>0000-00-00</my_start_date>
      <my_finish_date>0000-00-00</my_finish_date>
      <my_score>0</my_score>
      <my_storage_value>0.00</my_storage_value>
      <my_status>${status}</my_status>
      <my_comments><![CDATA[]]></my_comments>
      <my_times_watched>0</my_times_watched>
      <my_rewatch_value></my_rewatch_value>
      <my_priority>LOW</my_priority>
      <my_tags><![CDATA[]]></my_tags>
      <my_rewatching>0</my_rewatching>
      <my_rewatching_ep>0</my_rewatching_ep>
      <my_discuss>0</my_discuss>
      <my_sns>default</my_sns>
      <update_on_import>1</update_on_import>
    </anime>`
}
function createMangaXML(
  malId: number,
  progress: number,
  status: MALMangaStatus,
  chapters: number,
  title: string
): string {
  return `
    <manga>
      <manga_mangadb_id>${malId}</manga_mangadb_id>
      <manga_title><![CDATA[${title ? title : "unknown"}]]></manga_title>
      <manga_volumes>0</manga_volumes>
      <manga_chapters>${chapters ? chapters : 0}</manga_chapters>
      <my_id>0</my_id>
      <my_read_chapters>${progress}</my_read_chapters>
      <my_start_date>0000-00-00</my_start_date>
      <my_finish_date>0000-00-00</my_finish_date>
      <my_score>0</my_score>
      <my_status>${status}</my_status>
      <my_reread_value></my_reread_value>
      <my_priority>LOW</my_priority>
      <my_rereading>0</my_rereading>
      <my_discuss>0</my_discuss>
      <update_on_import>1</update_on_import>
    </manga>`
}

async function createAnimeListXML(
  mediaWithProgress: MediaWithProgress[]
): Promise<string> {
  const statusMap = {
    PLANNING: MALAnimeStatus.PLAN_TO_WATCH,
    COMPLETED: MALAnimeStatus.COMPLETED,
    CURRENT: MALAnimeStatus.WATCHING,
    PAUSED: MALAnimeStatus.ON_HOLD,
    DROPPED: MALAnimeStatus.DROPPED,
  }

  const xmlEntries = mediaWithProgress.map((anime) => {
    const malId = anime.malId
    const progress = anime.progress
    const episodes = anime.episodes
    const title = getTitle(anime.title)
    const status = statusMap[anime.status as keyof typeof statusMap]

    return createAnimeXML(malId, progress, status, episodes, title)
  })

  return `<myanimelist>
            <myinfo>
              <user_id/>
              <user_name>${await Auth.MyUserName()}</user_name>
              <user_export_type>1</user_export_type>
              <user_total_anime>0</user_total_anime>
              <user_total_watching>0</user_total_watching>
              <user_total_completed>0</user_total_completed>
              <user_total_onhold>0</user_total_onhold>
              <user_total_dropped>0</user_total_dropped>
              <user_total_plantowatch>0</user_total_plantowatch>
            </myinfo>
            \n${xmlEntries.join("\n")}\n
          </myanimelist>`
}
async function createMangaListXML(
  mediaWithProgress: MediaWithProgress[]
): Promise<string> {
  const statusMap = {
    PLANNING: MALMangaStatus.PLAN_TO_READ,
    COMPLETED: MALMangaStatus.COMPLETED,
    CURRENT: MALMangaStatus.READING,
    PAUSED: MALMangaStatus.ON_HOLD,
    DROPPED: MALMangaStatus.DROPPED,
  }

  const xmlEntries = mediaWithProgress.map((manga) => {
    const malId = manga.malId
    const progress = manga.progress
    const chapters = manga.chapters
    const title = getTitle(manga.title)
    const status = statusMap[manga.status as keyof typeof statusMap]

    return createMangaXML(malId, progress, status, chapters, title)
  })

  return `<myanimelist>
            <myinfo>
              <user_id/>
              <user_name>${await Auth.MyUserName()}</user_name>
              <user_export_type>2</user_export_type>
              <user_total_manga>5</user_total_manga>
              <user_total_reading>1</user_total_reading>
              <user_total_completed>1</user_total_completed>
              <user_total_onhold>1</user_total_onhold>
              <user_total_dropped>1</user_total_dropped>
              <user_total_plantoread>1</user_total_plantoread>
            </myinfo>
            \n${xmlEntries.join("\n")}\n
          </myanimelist>`
}

export {
  aniListEndpoint,
  createAnimeListXML,
  createAnimeXML,
  createMangaListXML,
  createMangaXML,
  formatDateObject,
  getDownloadFolderPath,
  getFormattedDate,
  getNextSeasonAndYear,
  getTitle,
  redirectUri,
  removeHtmlAndMarkdown,
  saveJSONasCSV,
  saveJSONasJSON,
  selectFile,
}
