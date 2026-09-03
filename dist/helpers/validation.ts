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
	 * Validate if a MyAnimeList anime/manga export XML file is valid or not
	 * @param xmlData string
	 * @param listKey 'anime' | 'manga'
	 * @param idField the MAL id field name for the list item (eg: series_animedb_id)
	 * @param titleField the title field name for the list item (eg: series_title)
	 * @returns boolean
	 */
	private static async Import_MALXML(
		xmlData: string,
		listKey: 'anime' | 'manga',
		idField: string,
		titleField: string
	): Promise<boolean> {
		try {
			const result = await parseStringPromise(xmlData, { explicitArray: false })
			if (!result || !result.myanimelist) {
				console.error(
					"Invalid XML structure: Missing 'myanimelist' root element."
				)
				return false
			}
			const list = result.myanimelist[listKey]
			if (!list) {
				console.error(`Invalid XML structure: Missing '${listKey}' elements.`)
				return false
			}
			const array = Array.isArray(list) ? list : [list]
			const isValid = array.every((item) => {
				const isValidId = item[idField] && !isNaN(Number(item[idField]))
				const hasRequiredFields = item[titleField] && item.my_status
				return isValidId && hasRequiredFields
			})
			if (!isValid) {
				console.error(
					`Validation failed: Some ${listKey} entries are missing required fields or have invalid IDs.`
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
	static async Import_AnimeXML(xmlData: string): Promise<boolean> {
		return Validate.Import_MALXML(
			xmlData,
			'anime',
			'series_animedb_id',
			'series_title'
		)
	}
	/**
	 * Validate if MyAnimeList Manga XML file is valid or not
	 * @param xmlData string
	 * @returns boolean
	 */
	static async Import_MangaXML(xmlData: string): Promise<boolean> {
		return Validate.Import_MALXML(
			xmlData,
			'manga',
			'manga_mangadb_id',
			'manga_title'
		)
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
			const obj3ct = JSON.parse(file)
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
