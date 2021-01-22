"use strict";

const scrapeIt = require("scrape-it");

const { Exceptions, SearchError } = require("../exceptions");
const { languages } = require("./languages");

function extractNumber(text) {
  if (!text) return 0;
  return parseInt(
    text
      .match(/(\d+)/g)
      .reduce((prev, curr) => prev.toString() + curr.toString())
  );
}

module.exports = async function ({
  mirror,
  query,
  count,
  extension,
  offset,
  searchIn,
  wildcardWords,
  language,
}) {
  if (!mirror) return new Error("No mirror provided to search function");

  // Ensure that the type of offset is number,
  // or string and add it to count value
  let localoffset = 0;

  if (offset && typeof offset === "number") {
    localoffset = offset;
  } else if (typeof offset === "string") {
    localoffset = parseInt(offset);
  }

  // searchIn options: "def", "title", "author", "series"
  const criteria = searchIn === "def" ? "" : searchIn || "";

  // Each word in a query will be searched as wildcard. This allows searchig
  // for more words forms
  const wildcard = wildcardWords ? 1 : 0;

  // Select language according to ISO-like codes
  //
  // language options: "def" (equals to "any"), "af", "ar","as","az","eu",
  // "be", "bn","bs","br","bg","my","ca","zh","hr","cs","da","de","nl","en",
  // "eo","et","fo","fi","fr","gl","gr","el","gu","he","hi","hu","is",
  // "id","ga","it","ja","ko","la","lv","lt","mk","ml","mr","ne","no","nb",
  // "oc","pa","fa","pl","pt","ro","ru","sc","sr","sk", "es", "su","sw","sv","tl",
  // "ty","ta","te","tn","tr","ot","tk","uk","ur","vi","yi"
  //
  // Refer to ./languages.js to see actual values send in request
  const languageStr = languages.get(language);

  // format options: "def", 'epub', 'mobi', 'azw', 'azw3', 'fb2', 'pdf',
  // 'rtf', 'txt' (must be lowercase)
  const format = extension === "def" ? "" : extension || "";

  // Closest page : Use to modify starting page to value that may not be = 1.
  // 0-24  : page 1
  // 25-49 : page 2
  // 50-74 : page 3 ....
  const closestpage = localoffset ? Math.floor(localoffset / 25) + 1 : 1;

  const url =
    mirror +
    "/fiction/?q=" +
    encodeURIComponent(query) +
    "&criteria=" +
    criteria +
    "&wildcard=" +
    wildcard +
    "&language=" +
    encodeURIComponent(languageStr) + // some languages have multiple words
    "&format=" +
    format +
    "&page=" +
    closestpage;

  try {
    const scrapedData = await scrapeIt(url, {
      totalCount: "body > div:nth-child(7) > div:nth-child(1)",
      links: {
        listItem: "body > table > tbody > tr > td:nth-child(3) > a",
        data: {
          value: {
            attr: "href",
          },
        },
      },
    });

    let { totalCount, links } = scrapedData.data;

    if (totalCount === null)
      return new Error("Bad response: could not parse search results");

    totalCount = extractNumber(totalCount);

    if (totalCount === 0)
      return new SearchError(
        Exceptions.NO_RESULTS,
        `No results for "${query}"`
      );
    else if (!totalCount)
      return new Error("Could not determine # of search results");

    // do() .... while() removed in favor of a simpler while loop. Do while ensures that loop always runs once.
    // having a while loop instead ensures we only get exact counts.
    // So, for example, if we wanted top 10 items, the previous request (see above request) would get that.
    // But then we fetch once again in the do .... while at least. So instead of having the minimum of 25 or
    // so results, we have 50 results that get trimmed down. That is unnecessary and can be fixed.
    while (
      links.length < totalCount &&
      links.length + 25 * (closestpage - 1) < count + offset
    ) {
      const url =
        mirror +
        "/fiction/?q=" +
        encodeURIComponent(query) +
        "&criteria=" +
        criteria +
        "&wildcard=" +
        wildcard +
        "&language=" +
        encodeURIComponent(languageStr) + // some languages have multiple words
        "&format=" +
        format +
        "&page=" +
        // parentheses around the whole ensures the plus sign is
        // interpreted as addition and not string concatenation
        (Math.floor(links.length / 25) + closestpage);

      try {
        const scrapedData = await scrapeIt(url, {
          totalCount: "body > div:nth-child(7) > div:nth-child(1)",
          links: {
            listItem: "body > table > tbody > tr > td:nth-child(3) > a",
            data: {
              value: {
                attr: "href",
              },
            },
          },
        });
        links.push(...scrapedData.data.links);
      } catch (err) {
        return err;
      }
    }

    return { links, totalCount };
  } catch (err) {
    return err;
  }
};
