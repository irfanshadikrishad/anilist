#### AniList

Unofficial Anilist CLI

#### How to install?

Make sure [Node.js](https://nodejs.org/en) and [npm](https://www.npmjs.com) are already installed in your system.
Verify installation using

```bash
node -v
npm -v
```

If you see the version then its installed. Otherwise install nodejs and npm should already be installed with nodejs.
Then install the package by running

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

#### CLI Commands Overview

| **Command**                         | **Options**                      | **Description**                                  |
| ----------------------------------- | -------------------------------- | ------------------------------------------------ |
| **`login`**                         | `-i, --id` `-s, --secret`        | Log in with your AniList credentials             |
| **`logout`**                        | _None_                           | Log out from your AniList account                |
| **`me`**                            | _None_                           | Display information about the logged-in user     |
| **`-V, --version`**                 | _None_                           | Display the current version of the CLI           |
| **`-h, --help`**                    | _None_                           | Display available commands and options           |
| **`trending`** <br> _(alias: `tr`)_ | `-c (default: 10)`               | Fetch trending anime (default count is 10)       |
| **`popular`** <br> _(alias: `plr`)_ | `-c (default: 10)`               | Fetch popular anime (default count is 10)        |
| **`user`**                          | `-un (username)`                 | Get information about a specific AniList user    |
| **`lists`** <br> _(alias: `ls`)_    | `-a, --anime` <br> `-m, --manga` | Fetch anime or manga lists of the logged-in user |
| **`delete`** <br> _(alias: `del`)_  | `-a, --anime` <br> `-m, --manga` | Delete collections of anime or manga             |
| **`upcoming`** <br> _(alias:`up`)_  | `-c (default: 10)`               | Fetch upcoming anime (default count is 10)       |
| **`anime`**                         | `anime Id`                       | Get anime details by Anime Id                    |

#### Command Breakdown:

#### `login`:

- **Options**:
  - `-i, --id`: Specify AniList Client ID
  - `-s, --secret`: Provide the AniList Client Secret
- **Usage**: Authenticate and log in to AniList using your ID and secret credentials.

#### `logout`:

- **Description**: End the current session and log out from your AniList account.

#### `me`:

- **Description**: Retrieve and display information about the currently logged-in user, including stats and profile details.

#### `-V, --version`:

- **Description**: Quickly check which version of the CLI you are running.

#### `-h, --help`:

- **Description**: List all available commands and their usage details for quick reference.

#### `trending` _(alias: `tr`)_:

- **Options**:
  - `-c (count)`: Specify how many trending anime to fetch (default: 10).
- **Description**: Fetch the current trending anime series, with the option to customize how many results to display.

#### `popular` _(alias: `plr`)_:

- **Options**:
  - `-c (count)`: Specify how many popular anime to fetch (default: 10).
- **Description**: Fetch the most popular anime series, with the option to customize how many results to display.

#### `upcoming` _(alias: `up`)_:

- **Options**:
  - `-c (count)`: Specify how many upcoming anime to fetch (default: 10).
- **Description**: Fetch the upcoming anime series next season, with the option to customize how many results to display.

#### `user`:

- **Options**:
  - `-un (username)`: Specify the AniList username to fetch.
- **Description**: Retrieve profile information about a specific AniList user.

#### `lists` _(alias: `ls`)_:

- **Options**:
  - `-a, --anime`: Fetch the authenticated user's anime list.
  - `-m, --manga`: Fetch the authenticated user's manga list.
- **Description**: Get the anime or manga lists of the logged-in user.

#### `delete` _(alias: `del`)_:

- **Options**:
  - `-a, --anime`: Delete your specific anime collection that you want.
  - `-m, --manga`: Delete your specific manga collection that you want.
- **Description**: Delete the entire anime or manga collection from the logged-in user's profile.

#### `anime`

- **Options**
  - `anime Id` _(eg: 21)_ : Id of the anime you want to get details of.
- **Description**: Get anime details by anime Id.

#### Security

Since you are creating your own API client for login no else else can get your credentials and the generated access token will be stored in your own system. So, As long as you don't share your device (in case you do, just logout) you are safe.

#### **_Thanks for visiting 💙_**
