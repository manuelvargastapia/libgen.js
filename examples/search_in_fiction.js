const libgen = require("../index.js");

(async () => {
  const options = {
    mirror: "http://libgen.is",
    query: "dragon",
    count: 30,
    offset: 0,
    searchIn: "series",
    wildcardWords: true,
    extension: "pdf",
    language: "en",
  };

  try {
    const data = await libgen.searchInFiction(options);
    let n = data.results.length;
    console.log(
      "top " +
        n +
        ' results for "' +
        options.query +
        '"' +
        " with extension " +
        options.extension +
        " and language " +
        options.language +
        '"'
    );
    while (n--) {
      console.log("***********");
      console.log("ID: " + data.results[n].id);
      console.log("Title: " + data.results[n].title);
      console.log("Author: " + data.results[n].author);
      console.log("Series: " + data.results[n].series);
      console.log("Language: " + data.results[n].language);
      console.log("Year: " + data.results[n].year);
      console.log("Publisher: " + data.results[n].publisher);
      console.log("ISBN: " + data.results[n].isbn);
      console.log("Format: " + data.results[n].format);
      console.log("File Size: " + data.results[n].filesize);
      console.log("Cover URL: " + data.results[n].coverurl);
      console.log("MD5: " + data.results[n].md5);
      console.log("Description: " + data.results[n].description);
    }
    return true;
  } catch (err) {
    return console.error(err);
  }
})();
