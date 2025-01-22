import { parseStringPromise } from "xml2js"

class Validate {
  static Import_JSON(data: { id: number }[]) {
    return (
      Array.isArray(data) &&
      data.every(
        (item) => typeof item === "object" && item !== null && "id" in item
      )
    )
  }
  static async Import_AnimeXML(xmlData: string): Promise<boolean> {
    try {
      const result = await parseStringPromise(xmlData, { explicitArray: false })
      if (!result || !result.myanimelist) {
        return false
      }
      const animeList = result.myanimelist.anime
      if (!animeList) {
        return false
      }
      const animeArray = Array.isArray(animeList) ? animeList : [animeList]

      return animeArray.every((anime) => {
        return (
          anime.series_animedb_id &&
          anime.series_title &&
          anime.my_status &&
          !isNaN(Number(anime.series_animedb_id))
        )
      })
    } catch (error) {
      console.error("Error parsing or validating XML:", error)
      return false
    }
  }
  static async Import_MangaXML(xmlData: string): Promise<boolean> {
    try {
      const result = await parseStringPromise(xmlData, { explicitArray: false })
      if (!result || !result.myanimelist) {
        return false
      }
      const mangaList = result.myanimelist.manga
      if (!mangaList) {
        return false
      }
      const mangaArray = Array.isArray(mangaList) ? mangaList : [mangaList]

      return mangaArray.every((manga) => {
        return (
          manga.manga_mangadb_id &&
          manga.manga_title &&
          manga.my_status &&
          !isNaN(Number(manga.manga_mangadb_id))
        )
      })
    } catch (error) {
      console.error("Error parsing or validating XML:", error)
      return false
    }
  }
}

export { Validate }
