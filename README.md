#### @irfanshadikrishad/anilist

Minimalist unofficial AniList CLI for Anime and Manga Enthusiasts.

![NPM Version](https://img.shields.io/npm/v/%40irfanshadikrishad%2Fanilist?style=for-the-badge&color=%23adc178)
![NPM Downloads](https://img.shields.io/npm/dw/%40irfanshadikrishad%2Fanilist?style=for-the-badge&color=%23eaac8b)
![NPM License](https://img.shields.io/npm/l/%40irfanshadikrishad%2Fanilist?style=for-the-badge&color=%23f2d0a4)

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

```bash
anilist login -i <client-id> -s <client-secret>
```

> [!NOTE]
> here `<client-id>` and `<client-secret>` should be replaced by the ones that you recieved from the developer setting. Also don't include `<>`, this only indicates need-to-be-replaced data.

#### CLI Commands Overview

| **Command**                             | **Options**                                                             | **Description**                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `login`                                 | `-i, --id` `-s, --secret`                                               | Log in with your AniList credentials                                                       |
| `logout`                                | _None_                                                                  | Log out from your AniList account                                                          |
| `whoami`                                | _None_                                                                  | Display information about the logged-in user                                               |
| `-V, --version`                         | _None_                                                                  | Display the current version of the CLI                                                     |
| `-h, --help`                            | _None_                                                                  | Display available commands and options                                                     |
| `trending` <br> _(alias: `tr`)_         | `-c (default: 10)`                                                      | Fetch trending anime (default count is 10)                                                 |
| `popular` <br> _(alias: `plr`)_         | `-c (default: 10)`                                                      | Fetch popular anime (default count is 10)                                                  |
| `user`                                  | `<username>`                                                            | Get information about a specific AniList user                                              |
| `lists` <br> _(alias: `ls`)_            | `-a, --anime` <br> `-m, --manga`                                        | Fetch anime or manga lists of the logged-in user                                           |
| `delete` <br> _(alias: `del`)_          | `-a, --anime` <br> `-m, --manga` <br> `-s, --activity`                  | Delete collections of anime, manga or activities                                           |
| `upcoming` <br> _(alias:`up`)_          | `-c (default: 10)`                                                      | Fetch upcoming anime (default count is 10)                                                 |
| `anime`                                 | `<anime-id>`                                                            | Get anime details by Anime Id                                                              |
| `manga`                                 | `<manga-id>`                                                            | Get manga details by Manga ID                                                              |
| `search` <br> _(alias:`srch`/`find`)_   | `<query>` <br> `-a, --anime` <br> `-m, --manga` <br> `-c (default: 10)` | Get anime/manga search results                                                             |
| `status` <br> _(alias: `write`/`post`)_ | `<status>`                                                              | Write a status... (text/markdown/html)                                                     |
| `export` <br> _(alias: `exp`)_          | `-a, --anime` <br> `-m, --manga`                                        | Export anime or manga list in JSON, CSV or XML (MyAnimeList/AniDB)                         |
| `import` <br> _(alias: `imp`)_          | `-a, --anime` <br> `-m, --manga`                                        | Import anime or manga list from exported JSON, MyAnimeList (XML) or AniDB (json-large)     |
| `social` <br> _(alias: `sol`)_          | `-f, --follow` <br> `-u, --unfollow`                                    | Follow users who follows you or Unfollow who doesn't follow you back with a simple command |
| `move` <br> _(alias: `mv`)_             | `-a, --anime` <br> `-m, --manga`                                        | Move entire list to another list                                                           |

#### Command Breakdown:

#### `login`:

```bash
anilist login -i <client-id> -s <client-secret>
```

- Options:
  - `-i, --id`: Specify AniList Client ID
  - `-s, --secret`: Provide the AniList Client Secret
- Usage: Authenticate and log in to AniList using your ID and secret credentials.

#### `logout`:

```bash
anilist logout
```

- Description: End the current session and log out from your AniList account.

#### `whoami`:

```bash
anilist whoami
```

- Description: Retrieve and display information about the currently logged-in user, including stats and profile details.

#### `-V, --version`:

```bash
anilist -V
```

- Description: Quickly check which version of the CLI you are running.

#### `-h, --help`:

```bash
anilist -h
```

- Description: List all available commands and their usage details for quick reference.

#### `trending` _(alias: `tr`)_:

```bash
anilist tr -c 15
```

- Options:
  - `-c (count)`: Specify how many trending anime to fetch (default: 10).
- Description: Fetch the current trending anime series, with the option to customize how many results to display.

#### `popular` _(alias: `plr`)_:

```bash
anilist popular
```

- Options:
  - `-c (count)`: Specify how many popular anime to fetch (default: 10).
- Description: Fetch the most popular anime series, with the option to customize how many results to display.

#### `upcoming` _(alias: `up`)_:

```bash
anilist up -c 25
```

- Options:
  - `-c (count)`: Specify how many upcoming anime to fetch (default: 10).
- Description: Fetch the upcoming anime series next season, with the option to customize how many results to display.

#### `user`:

```bash
anilist user <username>
```

- Options:
  - `<username>`: Specify the AniList username to fetch.
- Description: Retrieve profile information about a specific AniList user.

#### `lists` _(alias: `ls`)_:

```bash
anilist ls -a
```

- Options:
  - `-a, --anime`: Fetch the authenticated user's anime list.
  - `-m, --manga`: Fetch the authenticated user's manga list.
- Description: Get the anime or manga lists of the logged-in user.

#### `delete` _(alias: `del`)_:

```bash
anilist del -s,
```

- Options:
  - `-a, --anime`: Delete your specific anime collection that you want.
  - `-m, --manga`: Delete your specific manga collection that you want.
  - `-s,, --activity`: Delete all or any type of activities you want.
- Description: Delete the entire anime or manga collection from the logged-in user's profile.

#### `anime`

```bash
anilist anime <anime-id>
```

- Options
  - `<anime-id>` _(eg: 21)_ : Id of the anime you want to get details of.
- Description: Get anime details by anime Id.

#### `manga`

```bash
anilist manga <manga-id>
```

- Options
  - `<anime-id>` _(eg: 21)_ : Id of the manga you want to get details of.
- Description: Get manga details by manga Id.

#### `search` _(alias: `srch`/`find`)_:

```bash
anilist search <query> -a -c 20
```

- Options:
  - `<query>` : What you want to search (eg: naruto).
  - `-a, --anime`: To get results of anime search.
  - `-m, --manga`: To get results of manga search.
  - `-c (count)`: Specify how many items to fetch (default: 10).
- Description: Get anime/manga search results

#### `status` _(alias: `write`/`post`)_:

```bash
anilist write <status>
```

- Options:
  - `<status>` : This is what you want to write, It can be HTML, Markdown and/or Text. But wrap it with quotation mark (") else it might get cut-off.
- Description: Get anime/manga search results

#### `export` _(alias: `exp`)_:

```bash
anilist export -a
```

- Options:
  - `-a, --anime`: To export anime list.
  - `-m, --manga`: To export manga list.
- Description: Export anime or manga list. For `XML (MyAnimeList/AniDB)` file, to import it on MyAnimeList, go [here](https://myanimelist.net/import.php) and choose `MyAnimeList Import` for `AniDB` go [here](https://anidb.net/user/import) and select `MyAnimeList.net - XML anime list export`.

#### `import` _(alias: `imp`)_:

```bash
anilist import -m
```

- Options:
  - `-a, --anime`: To import anime list.
  - `-m, --manga`: To import manga list.
- Description: Import anime or manga list. If you want to import anime/manga list from `MyAnimeList`, export the XML from [here](https://myanimelist.net/panel.php?go=export), for exporting list from `AniDB` go [here](https://anidb.net/user/export).

> [!NOTE]
> If you have exported from `AniDB`, you will have to unzip it, and there should be a file named `mylist.json`, copy and paste it in your systems download folder, and select it from import option.

> [!IMPORTANT]
> If you are importing from a file, place the file in the system specific download folder, And the exported file will also be exported there as well.

#### `social` _(alias: `sol`)_:

```bash
anilist sol -f
```

- Options:
  - `-f, --follow`: To follow users who follows you automatically.
  - `-u, --unfollow`: To unfollow users who doesn't follow you back.
- Description: It follows users who follows you or unfollow users who doesn't follow you back at ease.

#### Security

Since you are creating your own API client for login no else else can get your credentials and the generated access token will be stored in your own system. So, As long as you don't share your device (in case you do, just logout) you are safe.

#### Contribution

Want to contribute to the project? Check out complete guideline [here](CONTRIBUTING.md).

#### _Thanks for visiting 💙_
