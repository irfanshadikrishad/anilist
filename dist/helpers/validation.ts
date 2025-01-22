class Validate {
  static Import_JSON(data: { id: number }[]) {
    return (
      Array.isArray(data) &&
      data.every(
        (item) => typeof item === "object" && item !== null && "id" in item
      )
    )
  }
}

export { Validate }
