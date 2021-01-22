"use strict";

const { Exceptions } = require("../exceptions");

const fetchLinksFromTable = require("./fetch_links_from_table");
const fetchDetailsFromLinks = require("./fetch_details_from_links");

module.exports = async function ({
  mirror,
  query,
  offset,
  count,
  searchIn = "def",
  wildcardWords = false,
  extension = "def",
  language = "def",
}) {
  try {
    if (!count || !parseInt(count)) count = 10;

    // offset for results. Defaults to 0 to get all results.
    // Set to ensure that future results are agnostic of offset presence
    if (!offset) offset = offset || 0;

    let data = {
      // to fetch data, we need first scrap all the results from tables
      // and then fetch detailed books data using the links in the table
      links: "",
      // the total count of result will be also returned,
      totalCount: 0,
    };

    data = await fetchLinksFromTable({
      mirror,
      query,
      count,
      extension,
      offset,
      searchIn,
      wildcardWords,
      language,
    });

    if (data instanceof Error) {
      throw data;
    }

    // slice to trim data.
    // Initial check ensures that the slicing is required
    if (data.links.length > count) {
      // slicing differs between offset variants. If offset !== 0,
      if (offset) {
        // find the closest page to start at
        const closestPage = Math.floor(offset / 25) + 1;
        // and then calculate the offset from there.
        // So, for offset 30, we skip to page 2 and then offset 5 links from top. We then select $count items
        const start = offset - (closestPage - 1) * 25;
        data.links = data.links.slice(start, start + count);
      } else {
        // basic slicing only to trim off items from the end.
        data.links = data.links.slice(0, count);
      }
    }

    try {
      const results = await fetchDetailsFromLinks({
        mirror,
        links: data.links,
      });
      return { results, totalCount: data.totalCount };
    } catch (err) {
      return err;
    }
  } catch (err) {
    if (err && err.type === Exceptions.NO_RESULTS) {
      return { results: [], totalCount: 0 };
    }
    return err;
  }
};
