import { XMLParser } from "fast-xml-parser"
import fs from "fs"
import { readdir, readFile, writeFile } from "fs/promises"
import inquirer from "inquirer"
import { parse } from "json2csv"
import open from "open"
import { homedir } from "os"
import { join } from "path"
import process from "process"
import { Auth } from "./auth.js"
import { fetcher } from "./fetcher.js"
import {
  saveAnimeWithProgressMutation,
  saveMangaWithProgressMutation,
} from "./mutations.js"
import {
  currentUserAnimeList,
  currentUserMangaList,
  malIdToAnilistAnimeId,
  malIdToAnilistMangaId,
} from "./queries.js"
import {
  AniListMediaStatus,
  AnimeList,
  MALAnimeStatus,
  MALAnimeXML,
  MalIdToAnilistIdResponse,
  MALMangaStatus,
  MediaWithProgress,
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
              "Dropped": AniListMediaStatus.DROPPED,
              "Completed": AniListMediaStatus.COMPLETED,
              "Watching": AniListMediaStatus.CURRENT,
              "Plan to Watch": AniListMediaStatus.PLANNING,
            }
            const status = statusMap[anime.my_status]

            const anilist: MalIdToAnilistIdResponse = await fetcher(
              malIdToAnilistAnimeId,
              { malId }
            )
            try {
              if (anilist && anilist.data.Media.id) {
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
            } catch (error) {
              console.error(`\nMALimport-200 ${(error as Error).message}`)
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
  static async Manga() {
    try {
      const filename = await selectFile(".xml")
      const filePath = join(getDownloadFolderPath(), filename)
      const fileContent = await readFile(filePath, "utf8")
      const parser = new XMLParser()
      if (fileContent) {
        const XMLObject = parser.parse(fileContent)
        if (XMLObject.myanimelist.manga.length > 0) {
          let count = 0
          const mangas = XMLObject.myanimelist.manga
          for (let manga of mangas) {
            const malId = manga.manga_mangadb_id
            const progress = manga.my_read_chapters
            const statusMap = {
              "On-Hold": AniListMediaStatus.PAUSED,
              "Dropped": AniListMediaStatus.DROPPED,
              "Completed": AniListMediaStatus.COMPLETED,
              "Reading": AniListMediaStatus.CURRENT,
              "Plan to Read": AniListMediaStatus.PLANNING,
            }
            const status = statusMap[manga.my_status]

            const anilist: MalIdToAnilistIdResponse = await fetcher(
              malIdToAnilistMangaId,
              {
                malId: malId,
              }
            )
            if (anilist?.data?.Media?.id) {
              const anilistId = anilist?.data?.Media?.id
              if (anilistId) {
                const saveManga: saveAnimeWithProgressResponse = await fetcher(
                  saveMangaWithProgressMutation,
                  {
                    mediaId: anilistId,
                    progress: progress,
                    status: status,
                    hiddenFromStatusLists: false,
                    private: false,
                  }
                )
                if (saveManga) {
                  const entryId = saveManga.data.SaveMediaListEntry.id
                  count++
                  console.log(`[${count}] ${entryId} ✅`)
                }
              }
            }
          }
        } else {
          console.log(`\nNo manga list seems to be found.`)
        }
      }
    } catch (error) {
      console.error(`\nError from MALimport. ${(error as Error).message}`)
    }
  }
}
class MALexport {
  static async Anime() {
    try {
      if (await Auth.isLoggedIn()) {
        const animeList: AnimeList = await fetcher(currentUserAnimeList, {
          id: await Auth.MyUserId(),
        })
        if (animeList?.data?.MediaListCollection?.lists.length > 0) {
          const lists = animeList?.data?.MediaListCollection?.lists
          const mediaWithProgress = lists.flatMap((list: any) =>
            list.entries.map((entry: any) => ({
              id: entry?.media?.id,
              malId: entry?.media?.idMal,
              title: entry?.media?.title,
              episodes: entry?.media?.episodes,
              siteUrl: entry?.media?.siteUrl,
              progress: entry.progress,
              status: entry?.status,
              hiddenFromStatusLists: false,
            }))
          )
          const xmlContent = createAnimeListXML(mediaWithProgress)
          const path = join(
            getDownloadFolderPath(),
            `${await Auth.MyUserName()}@irfanshadikrishad-anilist-myanimelist(anime)-${getFormattedDate()}.xml`
          )
          await writeFile(path, await xmlContent, "utf8")
          console.log(`Generated XML for MyAnimeList.`)

          open(getDownloadFolderPath())
        } else {
          console.log(
            `\nHey, ${await Auth.MyUserName()}. Your anime list seems to be empty.`
          )
        }
      }
    } catch (error) {
      console.error(`\nError from MALexport. ${(error as Error).message}`)
    }
  }
  static async Manga() {
    try {
      if (!(await Auth.isLoggedIn())) {
        console.log(`\nPlease login to use this feature.`)
        return
      }
      const mangaList: AnimeList = await fetcher(currentUserMangaList, {
        id: await Auth.MyUserId(),
      })
      if (mangaList && mangaList?.data?.MediaListCollection?.lists.length > 0) {
        const lists = mangaList?.data?.MediaListCollection?.lists
        const mediaWithProgress = lists.flatMap((list: any) =>
          list.entries.map((entry: any) => ({
            id: entry?.media?.id,
            malId: entry?.media?.idMal,
            title: entry?.media?.title,
            private: entry.private,
            chapters: entry.media.chapters,
            progress: entry.progress,
            status: entry?.status,
            hiddenFromStatusLists: entry.hiddenFromStatusLists,
          }))
        )
        const XMLContent = createMangaListXML(mediaWithProgress)
        const path = join(
          getDownloadFolderPath(),
          `${await Auth.MyUserName()}@irfanshadikrishad-anilist-myanimelist(manga)-${getFormattedDate()}.xml`
        )
        await writeFile(path, await XMLContent, "utf8")
        console.log(`Generated XML for MyAnimeList.`)

        open(getDownloadFolderPath())
      } else {
        console.log(
          `\nHey, ${await Auth.MyUserName()}. Your anime list seems to be empty.`
        )
      }
    } catch (error) {
      console.error(`\nError from MALexport. ${(error as Error).message}`)
    }
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
  formatDateObject,
  getNextSeasonAndYear,
  getTitle,
  importAnimeListFromExportedJSON,
  importMangaListFromExportedJSON,
  MALexport,
  MALimport,
  redirectUri,
  removeHtmlAndMarkdown,
  saveJSONasCSV,
  saveJSONasJSON,
}
