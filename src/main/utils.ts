export const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'

export const resolveHtmlPath = (htmlFileName: string) => {
  if (isDev) {
    const port = process.env.PORT || 3000
    const url = new URL(`http://localhost:${port}`)
    url.pathname = htmlFileName
    return url.href
  }
  return `file://${require('path').resolve(__dirname, '../renderer/', htmlFileName)}`
}