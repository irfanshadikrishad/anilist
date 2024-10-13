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

export { aniListEndpoint, redirectUri, getTitle };
