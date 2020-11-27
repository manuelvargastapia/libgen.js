"use strict"

const {Exceptions, SearchError} = require('./exceptions');

const got = require("got")

const ID_REGEX = /ID\:[^0-9]+[0-9]+[^0-9]/g
const RESULT_REGEX = /[0-9]+\ files\ found/i

function extractIds(html) {
  let ids = []
  const idsResults = html.match(ID_REGEX)
  // reverse the order of the results because we walk through them
  // backwards with while(n--)
  idsResults.reverse()
  let n = idsResults.length
  while (n--) {
    const id = idsResults[n].replace(/[^0-9]/g, "")

    if (!parseInt(id))
      return false

    ids.push(id)
  }
  return ids
}

async function idFetch(options) {
  if (!options.mirror)
    return new Error("No mirror provided to search function")

  else if (!options.query)
    return new Error("No search query given")

  else if (options.query.length < 4)
    return new Error("Search query must be at least four characters")

  if (!options.count || !parseInt(options.count))
    options.count = 10

  // Offsetting options. Ensure that the type of offset is number,
  // or string and add it to count value
  let localoffset = 0;

  if (options.offset && typeof options.offset === 'number') {
    localoffset = options.offset
  } else if (typeof options.offset === 'string') {
    localoffset = parseInt(options.offset)
  }

  // sort_by options: "def", "title", "publisher", "year", "pages",
  // "language", "filesize", "extension" (must be lowercase)
  const sort = options.sort_by || "def"

  // search_in options: "def", "title", "author", "series",
  // "periodical", "publisher", "year", "identifier", "md5",
  // "extension"
  const column = options.search_in || "def"

  // boolean
  const sortmode = (options.reverse ? "DESC" : "ASC")

  // Closest page : Use to modify starting page to value that may not be = 1.
  // 0-24  : page 1
  // 25-49 : page 2
  // 50-74 : page 3 ....
  const closestpage = (localoffset ? (Math.floor((localoffset) / 25) + 1) : 1)

  const query = options.mirror +
    "/search.php?&req=" +
    encodeURIComponent(options.query) +
    // important that view=detailed so we can get the real IDs
    "&view=detailed" +
    "&column=" + column +
    "&sort=" + sort +
    "&sortmode=" + sortmode +
    "&page=" + closestpage

  try {
    const response = await got(query)

    let results = response.body.match(RESULT_REGEX)
    if (results === null)
      return new Error("Bad response: could not parse search results")
    else
      results = results[0]

    results = parseInt(results.replace(/^([0-9]*).*/, "$1"))

    if (results === 0)
      return new SearchError(Exceptions.NO_RESULTS, `No results for "${options.query}"`)

    else if (!results)
      return new Error("Could not determine # of search results")

    let searchIds = extractIds(response.body)
    if (!searchIds)
      return new Error("Failed to parse search results for IDs")

    // do() .... while() removed in favor of a simpler while loop. Do while ensures that loop always runs once.
    // having a while loop instead ensures we only get exact counts. 
    // So, for example, if we wanted top 10 items, the previous request (see above request) would get that. 
    // But then we fetch once again in the do .... while at least. So instead of having the minimum of 25 or
    // so results, we have 50 results that get trimmed down. That is unnecessary and can be fixed. 
    while ((searchIds.length + 25 * (closestpage - 1)) < (options.count + options.offset)) {
      const query = options.mirror +
        "/search.php?&req=" +
        encodeURIComponent(options.query) +
        // important that view=detailed so we can get the real IDs
        "&view=detailed" +
        "&column=" + column +
        "&sort=" + sort +
        "&sortmode=" + sortmode +
        "&page=" +
        // parentheses around the whole ensures the plus sign is
        // interpreted as addition and not string concatenation
        (Math.floor((searchIds.length) / 25) + closestpage)

      try {
        let page = await got(query)

        const newIds = extractIds(page.body)

        if (!newIds)
          return new Error("Failed to parse search results for IDs")
        else
          searchIds = searchIds.concat(newIds)
      } catch (err) {
        return err
      }
    }

    return {ids: searchIds, count: results}
  } catch (err) {
    return err
  }
}

module.exports = async function (options) {
  try {

    // offset for results. Defaults to 0 to get all results.
    // Set to ensure that future results are agnostic of offset presence
    if (!options.offset)
      options.offset = options.offset || 0
    
    let data = {
      // options can include an "ids" property to fetch data directly
      // "ids" property can be a list of ids as string or a string array
      ids: "",
      // the total count of result will be also returned,
      // but only when the query is string based (not directly ids)
      count: 0
    }

    if (options.ids && options.ids.length) {
      data.ids = typeof options.ids === "string" ? options.ids.split(",") : options.ids
      data.count = null
    }else{
      data = await idFetch(options)
      if (data instanceof Error) {
        throw data
      }
    }

    // stringify fields
    // "fields" property can be a plain string or string array
    // Default "*" to get all the fields
    let fields = "*"

    if (options.fields && options.fields.length)
      fields = options.fields.toString()

    // slice options to trim data.
    // Initial check ensures that the slicing is required
    if (data.ids.length > options.count) {
      // slicing differs between offset variants. If offset !== 0,
      if (options.offset) {
        // find the closest page to start at
        const closestPage = (Math.floor((options.offset) / 25) + 1)
        // and then calculate the offset from there.
        // So, for offset 30, we skip to page 2 and then offset 5 ids from top. We then select $count items
        const start = (options.offset - (closestPage - 1) * 25)
        data.ids = data.ids.slice(start, start + options.count)
      } else {
        // basic slicing only to trim off items from the end.
        data.ids = data.ids.slice(0, options.count)
      }
    }

    const url = `${options.mirror}/json.php?ids=${data.ids.join(",")}&fields=${fields}`

    try {
      const response = await got(url)
      return {results: JSON.parse(response.body), count: data.count}
    } catch (err) {
      return err
    }
  } catch (err) {
    if (err && err.type === Exceptions.NO_RESULTS) {
      return { results: [], count: 0 }
    }
    return err
  }
}

