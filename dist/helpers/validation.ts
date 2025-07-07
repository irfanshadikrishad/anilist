import { parseStringPromise } from 'xml2js'

class Validate {
	/**
	 * Validate importable JSON file
	 * @param data string
	 * @returns boolean
	 */
	static Import_JSON(data: { id: number }[]) {
		return (
			Array.isArray(data) &&
			data.every(
				(item) => typeof item === 'object' && item !== null && 'id' in item
			)
		)
	}
	/**
	 * Validate if MyAnimeList Anime XML file is valid or not
	 * @param {string} xmlData
	 * @returns {Promise<boolean>}
	 */
	static async Import_AnimeXML(xmlData: string): Promise<boolean> {
		try {
			const result = await parseStringPromise(xmlData, { explicitArray: false })
			if (!result || !result.myanimelist) {
				console.error(
					"Invalid XML structure: Missing 'myanimelist' root element."
				)
				return false
			}
			const animeList = result.myanimelist.anime
			if (!animeList) {
				console.error("Invalid XML structure: Missing 'anime' elements.")
				return false
			}
			const animeArray = Array.isArray(animeList) ? animeList : [animeList]
			const isValid = animeArray.every((anime) => {
				const isValidId =
					anime.series_animedb_id && !isNaN(Number(anime.series_animedb_id))
				const hasRequiredFields = anime.series_title && anime.my_status
				return isValidId && hasRequiredFields
			})
			if (!isValid) {
				console.error(
					'Validation failed: Some anime entries are missing required fields or have invalid IDs.'
				)
			}
			return isValid
		} catch (error) {
			console.error('Error parsing or validating XML:', error)
			return false
		}
	}
	/**
	 * Validate if MyAnimeList Anime XML file is valid or not
	 * @param xmlData string
	 * @returns boolean
	 */
	static async Import_MangaXML(xmlData: string): Promise<boolean> {
		try {
			const result = await parseStringPromise(xmlData, { explicitArray: false })
			if (!result || !result.myanimelist) {
				console.error(
					"Invalid XML structure: Missing 'myanimelist' root element."
				)
				return false
			}
			const mangaList = result.myanimelist.manga
			if (!mangaList) {
				console.error("Invalid XML structure: Missing 'manga' elements.")
				return false
			}
			const mangaArray = Array.isArray(mangaList) ? mangaList : [mangaList]
			const isValid = mangaArray.every((manga) => {
				const isValidId =
					manga.manga_mangadb_id && !isNaN(Number(manga.manga_mangadb_id))
				const hasRequiredFields = manga.manga_title && manga.my_status
				return isValidId && hasRequiredFields
			})
			if (!isValid) {
				console.error(
					'Validation failed: Some manga entries are missing required fields or have invalid IDs.'
				)
			}
			return isValid
		} catch (error) {
			console.error('Error parsing or validating XML:', error)
			return false
		}
	}
	/**
	 * Validate AniDB json-large file
	 * @param file string of anidb json-large
	 * @returns boolean
	 */
	static async Import_AniDBJSONLarge(file: string): Promise<boolean> {
		try {
			if (!file?.trim()) {
				console.error('File content is empty or invalid.')
				return false
			}
			const obj3ct = await JSON.parse(file)
			if (!obj3ct || !Array.isArray(obj3ct.anime)) {
				console.error(
					"Invalid JSON structure: Missing or malformed 'anime' array."
				)
				return false
			}
			return true
		} catch (error) {
			console.error('Failed to parse JSON file:', error)
			return false
		}
	}
}

export { Validate }
