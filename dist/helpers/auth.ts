import fs from "fs";
import os from "os";
import path from "path";
import inquirer from "inquirer";
import open from "open";
import fetch from "node-fetch";
import { currentUserQuery } from "./queries.js";

const redirectUri = "https://anilist.co/api/v2/oauth/pin";
const home_dir = os.homedir();
const save_path = path.join(home_dir, ".anilist_token");

async function getAccessTokenFromUser() {
  const answers = await inquirer.prompt([
    {
      type: "password",
      name: "token",
      message: "Please enter your AniList access token:",
    },
  ]);
  return answers.token;
}

async function storeAccessToken(token: string) {
  fs.writeFileSync(save_path, token, { encoding: "utf8" });
}

async function retriveAccessToken() {
  if (fs.existsSync(save_path)) {
    return fs.readFileSync(save_path, { encoding: "utf8" });
  } else {
    return null;
  }
}

async function anilistUserLogin(cID: number, cSECRET: string) {
  console.log("Starting AniList login...");
  const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${cID}&redirect_uri=${redirectUri}&response_type=code`;
  console.log("Opening browser for AniList login...");
  open(authUrl);

  const authCode = await getAccessTokenFromUser();

  const tokenResponse = await fetch("https://anilist.co/api/v2/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: String(cID),
      client_secret: cSECRET,
      redirect_uri: redirectUri,
      code: authCode,
    }),
  });

  const token_Data: any = await tokenResponse.json();

  if (token_Data?.access_token) {
    console.log("Login successful!");
    await storeAccessToken(token_Data?.access_token);
  } else {
    console.error("Failed to get access token:", token_Data);
  }
}

async function currentUserInfo() {
  const loggedIn = await isLoggedIn();

  if (loggedIn) {
    const sToken = await retriveAccessToken();
    const request = await fetch(`https://graphql.anilist.co`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sToken}`,
      },
      body: JSON.stringify({ query: currentUserQuery }),
    });
    const { data, errors }: any = await request.json();

    if (request.status === 200) {
      const user = data?.Viewer;
      console.log(`\nID:\t\t\t${user?.id}`);
      console.log(`Name:\t\t\t${user?.name}`);
      console.log(`siteUrl:\t\t${user?.siteUrl}`);
      console.log(`profileColor:\t\t${user?.options?.profileColor}`);
      console.log(`timeZone:\t\t${user?.options?.timezone}`);
      console.log(`activityMergeTime:\t${user?.options?.activityMergeTime}`);
      console.log(`donatorTier:\t\t${user?.donatorTier}`);
      console.log(`donatorBadge:\t\t${user?.donatorBadge}`);
      console.log(`unreadNotificationCount:${user?.unreadNotificationCount}`);
      console.log(
        `Account Created:\t${new Date(user?.createdAt * 1000).toUTCString()}`
      );
      console.log(
        `Account Updated:\t${new Date(user?.updatedAt * 1000).toUTCString()}`
      );
      console.log(
        `Statistics (Anime)\nCount: ${user?.statistics?.anime?.count} meanScore: ${user?.statistics?.anime?.meanScore} minutesWatched: ${user?.statistics?.anime?.minutesWatched}`
      );
      console.log(
        `Statistics (Manga)\nCount: ${user?.statistics?.manga?.count} Chapter Read: ${user?.statistics?.manga?.chaptersRead} Volumes Read: ${user?.statistics?.manga?.volumesRead}`
      );
    } else {
      console.log(
        `Something went wrong. Please log in again. ${errors[0].message}`
      );
    }
  } else {
    console.log(`User not logged in. Please login first.`);
  }
}

async function isLoggedIn(): Promise<Boolean> {
  const isTokenStored = await retriveAccessToken();
  if (isTokenStored !== null) {
    return true;
  } else {
    return false;
  }
}

export {
  getAccessTokenFromUser,
  storeAccessToken,
  retriveAccessToken,
  anilistUserLogin,
  currentUserInfo,
  isLoggedIn,
};
