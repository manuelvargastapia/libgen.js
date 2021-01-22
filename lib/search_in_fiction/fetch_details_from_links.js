"use strict";

const request = require("request-promise");
const cheerio = require("cheerio");

const bookDetailsTableSelector = "body > div > table > tbody > tr";
const coverUrlSelector = "body > div > div > img";
const md5Selector = "body > div > div > table > tbody > tr:nth-child(1) > td";

function formatLabel(label) {
  return label
    .replace(":", "")
    .replace(/\s/g, "")
    .replace("(s)", "")
    .replace("/", "")
    .toLowerCase();
}

module.exports = async function ({ mirror, links }) {
  if (!mirror) return new Error("No mirror provided to search function");

  try {
    const results = [];

    // individual book data
    let bookDetails = {};

    // flag to apply special treatment to "Description" attribute scraped from page
    // needed because this particular table row doesn't follow the overall structure
    let isDescription = false;

    // fetch all the pages before scrapping
    const pages = await Promise.all(
      links.map(({ value }) => request.get(`${mirror}${value}`))
    );

    pages.forEach((page) => {
      // clean helper variables to avoid cloning objects and breaking validation
      bookDetails = {};
      isDescription = false;

      // load the page to analysis (returns a jQuery object)
      const $ = cheerio.load(page);

      // loop over desired table element in HTML
      $(bookDetailsTableSelector).each((_, element) => {
        // get all <tds> (table rows with shape "label": "value")
        const tds = $(element).find("td");

        const label = $(tds[0]).text().trim();
        const value = $(tds[1]).text().trim();

        // detect problematic "Description" label
        if (label.includes("Description")) {
          isDescription = true;
          return true;
        }

        if (isDescription) {
          // particular case where "label" keeps the actual description value
          bookDetails["description"] = label;
          isDescription = false;
        } else {
          bookDetails[formatLabel(label)] = value;
        }
      });

      // clean final individual data
      delete bookDetails["timeaddedtimemodified"];
      delete bookDetails["download"];
      delete bookDetails[""];

      // additional data
      bookDetails["coverurl"] = $(coverUrlSelector)[0].attribs.src;
      bookDetails["md5"] = $(md5Selector).text();

      results.push(bookDetails);
    });

    return results;
  } catch (err) {
    return err;
  }
};
