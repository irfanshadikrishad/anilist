import fs from "fs"
import inquirer from "inquirer"
import fetch from "node-fetch"
import open from "open"
import os from "os"
import path from "path"
import { fetcher } from "./fetcher.js"
import { currentUserQuery, userActivityQuery } from "./queries.js"
import { aniListEndpoint, getTitle, redirectUri } from "./workers.js"

const home_dir = os.homedir()
const save_path = path.join(home_dir, ".anilist_token")

async function getAccessTokenFromUser() {
  const { token } = await inquirer.prompt([
    {
      type: "password",
      name: "token",
      message: "Please enter your AniList access token:",
    },
  ])
  return token
}

async function storeAccessToken(token: string) {
  try {
    fs.writeFileSync(save_path, token, { encoding: "utf8" })
  } catch (error) {
    console.error(`\nError storing acess-token. ${(error as Error).message}`)
  }
}

async function retriveAccessToken() {
  if (fs.existsSync(save_path)) {
    return fs.readFileSync(save_path, { encoding: "utf8" })
  } else {
    return null
  }
}

async function anilistUserLogin(clientId: number, clientSecret: string) {
  console.log("Starting AniList login...")
  const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`
  console.log("Opening browser for AniList login...")
  open(authUrl)

  const authCode = await getAccessTokenFromUser()

  const tokenResponse = await fetch("https://anilist.co/api/v2/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: String(clientId),
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: authCode,
    }),
  })

  const token_Data: any = await tokenResponse.json()

  if (token_Data?.access_token) {
    await storeAccessToken(token_Data?.access_token)
    const name = await currentUsersName()
    if (name) {
      console.log(`\nWelcome Back, ${name}!`)
    } else {
      console.log(`\nLogged in successfull!`)
    }
  } else {
    console.error("\nFailed to get access token:", token_Data)
  }
}

async function currentUserInfo() {
  if (await isLoggedIn()) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await retriveAccessToken()}`,
    }
    const request = await fetch(aniListEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query: currentUserQuery }),
    })
    const { data, errors }: any = await request.json()

    if (request.status === 200) {
      const user = data?.Viewer
      const activiResponse: any = await fetcher(userActivityQuery, {
        id: user?.id,
        page: 1,
        perPage: 10,
      })
      const activities = activiResponse?.data?.Page?.activities

      console.log(`
ID:                     ${user?.id}
Name:                   ${user?.name}
siteUrl:                ${user?.siteUrl}
profileColor:           ${user?.options?.profileColor}
timeZone:               ${user?.options?.timezone}
activityMergeTime:      ${user?.options?.activityMergeTime}
donatorTier:            ${user?.donatorTier}
donatorBadge:           ${user?.donatorBadge}
unreadNotificationCount:${user?.unreadNotificationCount}
Account Created:        ${new Date(user?.createdAt * 1000).toUTCString()}
Account Updated:        ${new Date(user?.updatedAt * 1000).toUTCString()}
      
Statistics (Anime):
  Count:                ${user?.statistics?.anime?.count}
  Mean Score:           ${user?.statistics?.anime?.meanScore}
  Minutes Watched:      ${user?.statistics?.anime?.minutesWatched}
      
Statistics (Manga):
  Count:                ${user?.statistics?.manga?.count}
  Chapters Read:        ${user?.statistics?.manga?.chaptersRead}
  Volumes Read:         ${user?.statistics?.manga?.volumesRead}
`)

      console.log(`\nRecent Activities:`)
      if (activities.length > 0) {
        activities.map(({ status, progress, media }) => {
          console.log(
            `${status} ${progress ? `${progress} of ` : ""}${getTitle(
              media?.title
            )}`
          )
        })
      }

      return user
    } else {
      console.error(
        `\nSomething went wrong. Please log in again. ${errors[0].message}`
      )
      return null
    }
  } else {
    console.error(`\nPlease login first to use this feature.`)
    return null
  }
}

async function isLoggedIn(): Promise<boolean> {
  if ((await retriveAccessToken()) !== null) {
    return true
  } else {
    return false
  }
}

async function logoutUser() {
  if (fs.existsSync(save_path)) {
    try {
      fs.unlinkSync(save_path)
      console.log(
        `\nLogout successful. See you soon, ${await currentUsersName()}.`
      )
    } catch (error) {
      console.error("\nError logging out:", error)
    }
  } else {
    console.error("\nYou may already be logged out.")
  }
}

async function currentUsersId() {
  if (!(await isLoggedIn())) {
    console.log(`\nUser not logged in.`)
    return null
  }
  const request = await fetch(aniListEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await retriveAccessToken()}`,
    },
    body: JSON.stringify({ query: currentUserQuery }),
  })
  const { data }: any = await request.json()
  if (request.status === 200) {
    return data?.Viewer?.id
  } else {
    return null
  }
}

async function currentUsersName() {
  if (!(await isLoggedIn())) {
    console.log(`\nUser not logged in.`)
    return null
  }
  const request = await fetch(aniListEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await retriveAccessToken()}`,
    },
    body: JSON.stringify({ query: currentUserQuery }),
  })
  const { data }: any = await request.json()
  if (request.status === 200) {
    return data?.Viewer?.name
  } else {
    return null
  }
}

export {
  anilistUserLogin,
  currentUserInfo,
  currentUsersId,
  currentUsersName,
  getAccessTokenFromUser,
  isLoggedIn,
  logoutUser,
  retriveAccessToken,
  storeAccessToken,
}
