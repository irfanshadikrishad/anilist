#### AniList

Unofficial Anilist CLI

#### How to install?

Make sure [Node.js](https://nodejs.org/en) and [npm](https://www.npmjs.com) are already installed in your system.
Then install the package by running (not-yet-published though)

```bash
npm install -g @irfanshadikrishad/anilist
```

This will install the package globally. And you have to use commands like

```bash
anilist tr -c 15
```

#### How to use?

Create an API client from [anilist developer setting](https://anilist.co/settings/developer) with an application name and redirect url as `https://anilist.co/api/v2/oauth/pin`. After creating the client you will get `Client ID` and `Client Secret` which is required in order to login from CLI.

To login:

```
anilist login -i <client-id> -s <client-secret>
```

here `<client-id>` and `<client-secret>` should be replaced by the ones that you recieved from the developer setting.

#### Available Commands:

| Commands      | Options                             | Uses                             |
| ------------- | ----------------------------------- | -------------------------------- |
| login         | -i (clientID) and -s (clientSecret) | To login with AniList            |
| logout        | null                                | To logout                        |
| me            | null                                | Information about logged in user |
|               | -V                                  | Get the CLI version              |
|               | -h                                  | Get available commands           |
| trending (tr) | -c (count: default 10)              | Get trending animes              |
| popular (plr) | -c (count: default 10)              | Get popular animes               |
| user          | -un (username)                      | Get information of the user      |

#### **_Thanks for visiting_**
