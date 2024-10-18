import { writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import open from "open";
import { parse } from "json2csv";

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

async function saveJSONasJSON(js0n: object): Promise<void> {
  try {
    const jsonData = JSON.stringify(js0n, null, 2);
    const path = join(
      getDownloadFolderPath(),
      `@irfanshadikrishad-anilist-anime-${getFormattedDate()}.json`
    );
    await writeFile(path, jsonData, "utf8");
    console.log(`\nSaved as JSON successfully.`);
    open(getDownloadFolderPath());
  } catch (error) {
    console.error("\nError saving JSON data:", error);
  }
}

async function saveJSONasCSV(js0n: object): Promise<void> {
  try {
    const csvData = parse(js0n);
    const path = join(
      getDownloadFolderPath(),
      `@irfanshadikrishad-anilist-anime-${getFormattedDate()}.csv`
    );
    await writeFile(path, csvData, "utf8");
    console.log(`\nSaved as CSV successfully.`);
    open(getDownloadFolderPath());
  } catch (error) {
    console.error("\nError saving CSV data:", error);
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
};
