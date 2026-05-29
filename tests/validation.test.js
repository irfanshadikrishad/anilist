import { jest } from '@jest/globals'
import { Validate } from '../bin/helpers/validation.js'

let consoleErrorSpy

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

const VALID_ANIME_XML = `<?xml version="1.0" encoding="UTF-8"?>
<myanimelist>
  <anime>
    <series_animedb_id>21</series_animedb_id>
    <series_title>One Piece</series_title>
    <my_status>Watching</my_status>
  </anime>
</myanimelist>`

const VALID_MANGA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<myanimelist>
  <manga>
    <manga_mangadb_id>21</manga_mangadb_id>
    <manga_title>One Piece</manga_title>
    <my_status>Reading</my_status>
  </manga>
</myanimelist>`

test('[Unit] Import_JSON valid', () => {
  expect(Validate.Import_JSON([{ id: 1 }, { id: 2 }])).toBe(true)
})

test('[Unit] Import_JSON invalid - not an array', () => {
  expect(Validate.Import_JSON({})).toBe(false)
})

test('[Unit] Import_JSON invalid - missing id field', () => {
  expect(Validate.Import_JSON([{ name: 'test' }])).toBe(false)
})

test('[Unit] Import_JSON empty array', () => {
  expect(Validate.Import_JSON([])).toBe(true)
})

test('[Unit] Import_AnimeXML valid', () => {
  expect(Validate.Import_AnimeXML(VALID_ANIME_XML)).toBe(true)
})

test('[Unit] Import_AnimeXML invalid - missing root element', () => {
  expect(Validate.Import_AnimeXML('<anime><series_animedb_id>1</series_animedb_id></anime>')).toBe(false)
})

test('[Unit] Import_AnimeXML invalid - missing anime elements', () => {
  expect(Validate.Import_AnimeXML('<myanimelist></myanimelist>')).toBe(false)
})

test('[Unit] Import_AnimeXML invalid - missing required fields', () => {
  const xml = `<myanimelist><anime><series_animedb_id>1</series_animedb_id></anime></myanimelist>`
  expect(Validate.Import_AnimeXML(xml)).toBe(false)
})

test('[Unit] Import_MangaXML valid', () => {
  expect(Validate.Import_MangaXML(VALID_MANGA_XML)).toBe(true)
})

test('[Unit] Import_MangaXML invalid - missing root element', () => {
  expect(Validate.Import_MangaXML('<manga><manga_mangadb_id>1</manga_mangadb_id></manga>')).toBe(false)
})

test('[Unit] Import_MangaXML invalid - missing manga elements', () => {
  expect(Validate.Import_MangaXML('<myanimelist></myanimelist>')).toBe(false)
})

test('[Unit] Import_AniDBJSONLarge valid', async () => {
  const json = JSON.stringify({ anime: [{ id: 1, status: 'complete' }] })
  expect(await Validate.Import_AniDBJSONLarge(json)).toBe(true)
})

test('[Unit] Import_AniDBJSONLarge invalid - missing anime array', async () => {
  expect(await Validate.Import_AniDBJSONLarge(JSON.stringify({}))).toBe(false)
})

test('[Unit] Import_AniDBJSONLarge invalid - empty string', async () => {
  expect(await Validate.Import_AniDBJSONLarge('')).toBe(false)
})

test('[Unit] Import_AniDBJSONLarge invalid - not an array', async () => {
  expect(await Validate.Import_AniDBJSONLarge(JSON.stringify({ anime: 'not-array' }))).toBe(false)
})
