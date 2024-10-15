const aniListEndpoint = `https://graphql.anilist.co`;
const redirectUri = "https://anilist.co/api/v2/oauth/pin";

function getTitle(title: { english?: string; romaji?: string }) {
  if (title?.english) {
    return title?.english;
  } else if (title?.romaji) {
    return title?.romaji;
  } else {
    return "???";
  }
}

function formatDateObject(
  dateObj: { day?: string; month?: string; year?: string } | null
) {
  if (!dateObj) return "null";
  const { day = "", month = "", year = "" } = dateObj;
  return [day, month, year].filter(Boolean).join("/");
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

export {
  aniListEndpoint,
  redirectUri,
  getTitle,
  getNextSeasonAndYear,
  formatDateObject,
  removeHtmlAndMarkdown,
};
