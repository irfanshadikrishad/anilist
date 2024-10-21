import inquirer from "inquirer";
import open from "open";
import { join } from "path";
import { homedir } from "os";
import { parse } from "json2csv";
import { writeFile, readdir, readFile } from "fs/promises";
import { currentUsersName } from "./auth.js";
import {
  saveAnimeWithProgressMutation,
  saveMangaWithProgressMutation,
} from "./mutations.js";
import { fetcher } from "./fetcher.js";

const aniListEndpoint = `https://graphql.anilist.co`;
const redirectUri = "https://anilist.co/api/v2/oauth/pin";

function getTitle(title: { english?: string; romaji?: string }) {
  return title?.english || title?.romaji || "???";
}

function formatDateObject(
  dateObj: { day?: string; month?: string; year?: string } | null
) {
  if (!dateObj) return "null";
  return (
    [dateObj.day, dateObj.month, dateObj.year].filter(Boolean).join("/") ||
    "null"
  );
}

function getNextSeasonAndYear() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  let nextSeason: string;
  let nextYear: number;

  // Determine the current season
  if (currentMonth >= 12 || currentMonth <= 2) {
    nextSeason = "SPRING";
    nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  } else if (currentMonth >= 3 && currentMonth <= 5) {
    nextSeason = "SUMMER";
    nextYear = currentYear;
  } else if (currentMonth >= 6 && currentMonth <= 8) {
    nextSeason = "FALL";
    nextYear = currentYear;
  } else if (currentMonth >= 9 && currentMonth <= 11) {
    nextSeason = "WINTER";
    nextYear = currentYear + 1;
  }

  return { nextSeason, nextYear };
}

function removeHtmlAndMarkdown(input: string) {
  if (input) {
    input = input.replace(/<\/?[^>]+(>|$)/g, "");
    input = input.replace(/(^|\n)#{1,6}\s+(.+?)(\n|$)/g, "$2 ");
    input = input.replace(/(\*\*|__)(.*?)\1/g, "$2");
    input = input.replace(/(\*|_)(.*?)\1/g, "$2");
    input = input.replace(/`(.+?)`/g, "$1");
    input = input.replace(/\[(.*?)\]\(.*?\)/g, "$1");
    input = input.replace(/!\[(.*?)\]\(.*?\)/g, "$1");
    input = input.replace(/(^|\n)>\s+(.+?)(\n|$)/g, "$2 ");
    input = input.replace(/(^|\n)-\s+(.+?)(\n|$)/g, "$2 ");
    input = input.replace(/(^|\n)\d+\.\s+(.+?)(\n|$)/g, "$2 ");
    input = input.replace(/(^|\n)\s*([-*_]){3,}\s*(\n|$)/g, "$1");
    input = input.replace(/~~(.*?)~~/g, "$1");
    input = input.replace(/\s+/g, " ").trim();
  }
  return input;
}
function getDownloadFolderPath(): string {
  const homeDirectory = homedir();

  // Determine the Downloads folder path based on the platform
  if (process.platform === "win32") {
    return join(homeDirectory, "Downloads");
  } else if (process.platform === "darwin" || process.platform === "linux") {
    return join(homeDirectory, "Downloads");
  }

  return homeDirectory;
}

function getFormattedDate(): string {
  const date = new Date();

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // Format as DD-MM-YYYY-HH-MM
  return `${day}-${month}-${year}-${hours}-${minutes}`;
}

/**
 * Export JSON as JSON
 * @param js0n
 * @param dataType (eg: anime/manga)
 */
async function saveJSONasJSON(js0n: object, dataType: string): Promise<void> {
  try {
    const jsonData = JSON.stringify(js0n, null, 2);
    const path = join(
      getDownloadFolderPath(),
      `${await currentUsersName()}@irfanshadikrishad-anilist-${dataType}-${getFormattedDate()}.json`
    );
    await writeFile(path, jsonData, "utf8");
    console.log(`\nSaved as JSON successfully.`);
    open(getDownloadFolderPath());
  } catch (error) {
    console.error("\nError saving JSON data:", error);
  }
}

/**
 * Export JSON as CSV
 * @param js0n
 * @param dataType (eg: anime/manga)
 */
async function saveJSONasCSV(js0n: object, dataType: string): Promise<void> {
  try {
    const csvData = parse(js0n);
    const path = join(
      getDownloadFolderPath(),
      `${await currentUsersName()}@irfanshadikrishad-anilist-${dataType}-${getFormattedDate()}.csv`
    );
    await writeFile(path, csvData, "utf8");
    console.log(`\nSaved as CSV successfully.`);
    open(getDownloadFolderPath());
  } catch (error) {
    console.error("\nError saving CSV data:", error);
  }
}
async function listFilesInDownloadFolder(): Promise<string[]> {
  const downloadFolderPath = getDownloadFolderPath();
  const files = await readdir(downloadFolderPath);
  return files;
}
async function selectFile(): Promise<string> {
  try {
    const files = await listFilesInDownloadFolder();
    const onlyJSONfiles = files.filter((file) => file.endsWith(".json"));
    if (onlyJSONfiles.length > 0) {
      const answers = await inquirer.prompt([
        {
          type: "list",
          name: "fileName",
          message: "Select a file to import:",
          choices: onlyJSONfiles,
        },
      ]);

      return answers.fileName;
    } else {
      throw new Error(`\nNo importable JSON file(s) found in download folder.`);
    }
  } catch (error) {
    console.error("\nError selecting file:", error);
    throw error;
  }
}
async function importAnimeListFromExportedJSON() {
  try {
    const filename = await selectFile();
    const filePath = join(getDownloadFolderPath(), filename);
    const fileContent = await readFile(filePath, "utf8");
    const importedData = JSON.parse(fileContent);

    let count = 0;
    const batchSize = 5; // Number of requests in each batch
    const delay = 2000; // 2 seconds delay to avoid rate-limiting

    for (let i = 0; i < importedData.length; i += batchSize) {
      const batch = importedData.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (anime: any) => {
          const query = saveAnimeWithProgressMutation;
          const variables = {
            mediaId: anime?.id,
            progress: anime?.progress,
            status: anime?.status,
            hiddenFromStatusLists: false,
          };

          try {
            const save: any = await fetcher(query, variables);
            if (save) {
              const id = save?.data?.SaveMediaListEntry?.id;
              count++;
              console.log(`[${count}] ${anime?.id}-${id} ✅`);
            } else {
              console.error(`\nError saving ${anime?.id}`);
            }
          } catch (error) {
            console.error(
              `\nError saving ${anime?.id}: ${(error as Error).message}`
            );
          }
        })
      );

      // Avoid rate-limiting: Wait before sending the next batch
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    console.log(`\nTotal ${count} anime(s) imported successfully.`);
  } catch (error) {
    console.error(`\n${(error as Error).message}`);
  }
}

async function importMangaListFromExportedJSON() {
  try {
    const filename = await selectFile();
    const filePath = join(getDownloadFolderPath(), filename);
    const fileContent = await readFile(filePath, "utf8");
    const importedData = JSON.parse(fileContent);

    let count = 0;
    const batchSize = 5; // Adjust batch size as per rate-limit constraints
    const delay = 2000; // 2 seconds delay to avoid rate-limit

    // Process in batches
    for (let i = 0; i < importedData.length; i += batchSize) {
      const batch = importedData.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (manga: any) => {
          const query = saveMangaWithProgressMutation;
          const variables = {
            mediaId: manga?.id,
            progress: manga?.progress,
            status: manga?.status,
            hiddenFromStatusLists: false,
            private: manga?.private,
          };

          try {
            const save: any = await fetcher(query, variables);
            if (save) {
              const id = save?.data?.SaveMediaListEntry?.id;
              count++;
              console.log(`[${count}] ${manga?.id}-${id} ✅`);
            }
          } catch (err) {
            console.error(
              `\nError saving ${manga?.id}: ${(err as Error).message}`
            );
          }
        })
      );

      // Avoid rate-limit by adding delay after processing each batch
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    console.log(`\nTotal ${count} manga(s) imported successfully.`);
  } catch (error) {
    console.error(`\nError: ${(error as Error).message}`);
  }
}

export {
  aniListEndpoint,
  redirectUri,
  getTitle,
  getNextSeasonAndYear,
  formatDateObject,
  removeHtmlAndMarkdown,
  saveJSONasJSON,
  saveJSONasCSV,
  importAnimeListFromExportedJSON,
  importMangaListFromExportedJSON,
};
