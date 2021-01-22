const FSPersister = require("@pollyjs/persister-fs")
const NodeHttpAdapter = require("@pollyjs/adapter-node-http")
const path = require("path")
const { Polly, setupMocha: setupPolly } = require("@pollyjs/core")
Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

const assert = require("assert").strict
const getMirror = require("../../lib/speed.js").mirror
const hasField = require("../../lib/check.js")
const latest = require("../../lib/latest.js")
const random = require("../../lib/random.js")
const search = require("../../lib/search.js")
const searchInFiction = require("../../lib/search_in_fiction");

// get a working mirror and use that for the rest of the tests
let mirror

describe("async queries", () => {
  setupPolly({
    adapters: ["node-http"],
    persister: "fs",
    persisterOptions: {
      fs: {
        recordingsDir: path.resolve(__dirname, "recordings")
      }
    },
    recordFailedRequests: true
  })

  it("should return a working mirror base URL", async () => {
    try {
      mirror = await getMirror()

      if (!mirror) {
        assert(false, "getMirror() returned an empty string")
      }
      console.log("Using " + mirror);
      assert(true)
    } catch (err) {
      assert(false, err)
    }
  })

  describe("latest.id", () => {
    it("should return a number over 1282650", async () => {
      try {
        const data = await latest.id(mirror)

        if (!parseInt(data))
          assert(false, "Returned a NaN")

        if (parseInt(data) < 1282650)
          assert(false, `Number returned (${data}) is too low`)

        assert(true)
      } catch (err) {
        assert(false)
      }
    })
  })

  describe("latest.text", () => {
    it("should return a JSON object", async () => {
      try {
        const data = await latest.text(mirror)
        assert.ok(data)
      } catch (err) {
        assert(false)
      }
    })
  })

  describe("random.text", () => {
    it("should return one JSON object", async () => {
      const opts = {
        count: "honk",
        mirror: mirror
      }

      try {
        const data = await random.text(opts)
        assert.equal(data.length, 1, "did not return 1 text")
      } catch (err) {
        assert(false)
      }
    })

    it("should return a PDF from 2000 with a Title", async () => {
      const opts = {
        mirror: mirror,
        fields: [
          "Title",
          {
            year: "2000",
            extension: "pdf"
          }
        ]
      }

      try {
        const data = await random.text(opts)

        assert.equal(data.length, 1, "did not receive 1 text")
        assert.ok(hasField(data[0], "title"), "text is missing Title")
        assert.ok(hasField(data[0], "year", "2000"), `text has Year ${data[0].year}`)
        assert.ok(hasField(data[0], "extension", "pdf"), `text is a ${data[0].extension}`)

      } catch (err) {
        assert(false, err)
      }
    })
  })
  
  describe("search.js", () => {
    it("should return an array of 30 JSON objects", async () => {
      const options = {
        mirror: mirror,
        query: "math",
        count: 30,
        search_in: "series"
      }

      try {
        const data = await search(options)
        assert.equal(data.results.length, 30)
      } catch (err) {
        assert(false)
      }
    })

    it("should return an array of 10 JSON objects", async () => {
      const options = {
        mirror: mirror,
        query: "math",
        count: 0
      }

      try {
        const data = await search(options)
        assert.equal(data.results.length, 10)
      } catch (err) {
        assert(false)
      }
    })

    it("should return an array of 10 JSON objects with an offset of 10", async () => {
      const options = {
        mirror: mirror,
        query: "math",
        count: 10,
        offset: 10
      }

      try {
        const data = await search(options)
        assert.equal(data.results.length, 10)
      } catch (err) {
        assert(false)
      }
    })

    it("should contain 35 offset JSON objects that are in a basic search of 70", async () => {

      const options_offset = {
        mirror: mirror,
        query: "math",
        count: 35,
        offset: 35
      }

      const options_basic = {
        mirror: mirror,
        query: "math",
        count: 70
      }

      try {
        const data_offset = await search(options_offset)
        const data_basic = await search(options_basic)

        const data_basic_offset = data_basic.results.slice(options_offset.offset)

        const data_basic_ids = data_basic_offset.map((value) => {
          return value.id
        })

        const data_offset_ids = data_offset.results.map((value) => {
          return value.id
        })

        assert.deepStrictEqual(data_offset_ids, data_basic_ids)

      } catch (err) {
        assert(false)
      }
    })

    it("should return one JSON object containing only specified fields", async () => {
      const optionsForArrayCase = {
        mirror: mirror,
        query: "math",
        count: 1,
        fields: ['title', 'author', 'year', 'md5']
      }

      const optionsForStringCase = {
        mirror: mirror,
        query: "math",
        count: 1,
        fields: "title,author,year,md5"
      }

      try {
        const data1 = await search(optionsForArrayCase)
        const keys1 = Object.keys(data1.results[0]);
        assert.strictEqual(keys1.toString(), optionsForArrayCase.fields.toString())

        const data2 = await search(optionsForStringCase)
        const keys2 = Object.keys(data2.results[0]);
        assert.strictEqual(keys2.toString(), optionsForStringCase.fields)
      } catch (error) {
        assert(false)
      }
    })

    it('should return exactly the same 10 JSON objects either by using queries or ids', async () => {
      const optionsForQueryCase = {
        mirror: mirror,
        query: "math",
        count: 10
      }

      const optionsForIdsCase = {
        mirror: mirror,
        ids: "",
        count: 10
      }
      
      try {
        const data1 = await search(optionsForQueryCase)
        optionsForIdsCase.ids = data1.results.map(item => item.id)
        const data2 = await search(optionsForIdsCase)
        assert.deepStrictEqual(data1.results, data2.results)
      } catch (error) {
        assert(false)
      }
    })

    it('should return exactly the same 10 JSON objects by id either by usaing an array or string', async () => {
      const optionsForArrayCase = {
        mirror: mirror,
        ids: ["86", "430"],
      }

      const optionsForStringCase = {
        mirror: mirror,
        ids: "86,430",
      }
      
      try {
        const data1 = await search(optionsForArrayCase)
        const data2 = await search(optionsForStringCase)
        assert.deepStrictEqual(data1.results, data2.results)
      } catch (error) {
        assert(false)
      }
    })

    it('should return exactly 1 item by ids either by using an array or string', async () => {
      const optionsForArrayCase = {
        mirror: mirror,
        ids: ["86"],
      }

      const optionsForStringCase = {
        mirror: mirror,
        ids: "86",
      }
      
      try {
        const data1 = await search(optionsForArrayCase)
        const data2 = await search(optionsForStringCase)
        assert.strictEqual(data1.results.length, 1)
        assert.strictEqual(data2.results.length, 1)
      } catch (error) {
        assert(false)
      }
    })

    it('should return an empty array as result and count equals to 0', async () => {
      const options = {
        mirror: mirror,
        query: 'asdasdasd'
      }

      try {
        const data = await search(options);
        assert.strictEqual(data.results.length, 0);
        assert.strictEqual(data.count, 0);
      } catch (error) {
        assert(false);
      }
    })
  })

  describe("search in fiction", () => {
    it("should return an array of 30 JSON objects", async () => {
      const options = {
        mirror,
        query: "dragon",
        count: 30,
        searchIn: "title",
      };

      try {
        const data = await searchInFiction(options)
        assert.equal(data.results.length, 30)
      } catch (err) {
        assert(false)
      }
    })

    it("should return an array of 10 JSON objects", async () => {
      const options = {
        mirror: mirror,
        query: "math",
        count: 0
      }

      try {
        const data = await searchInFiction(options)
        assert.equal(data.results.length, 10)
      } catch (err) {
        assert(false)
      }
    })

    it("should return an array of 10 JSON objects with an offset of 10", async () => {
      const options = {
        mirror: mirror,
        query: "math",
        count: 10,
        offset: 10
      }

      try {
        const data = await searchInFiction(options)
        assert.equal(data.results.length, 10)
      } catch (err) {
        assert(false)
      }
    })

    it("should contain 35 offset JSON objects that are in a basic search of 70", async () => {

      const options_offset = {
        mirror: mirror,
        query: "math",
        count: 35,
        offset: 35
      }

      const options_basic = {
        mirror: mirror,
        query: "math",
        count: 70
      }

      try {
        const data_offset = await searchInFiction(options_offset)
        const data_basic = await searchInFiction(options_basic)

        const data_basic_offset = data_basic.results.slice(options_offset.offset)

        const data_basic_ids = data_basic_offset.map((value) => {
          return value.id
        })

        const data_offset_ids = data_offset.results.map((value) => {
          return value.id
        })

        assert.deepStrictEqual(data_offset_ids, data_basic_ids)

      } catch (err) {
        assert(false)
      }
    })

    it('should return an empty array as result and count equals to 0', async () => {
      const options = {
        mirror: mirror,
        query: 'asdasdasd'
      }

      try {
        const data = await searchInFiction(options);
        assert.strictEqual(data.results.length, 0);
        assert.strictEqual(data.totalCount, 0);
      } catch (error) {
        assert(false);
      }
    })

    it('should return an array with 50 results where extension is PDF', async () => {
      const options = {
        mirror,
        query: 'dragon',
        extension: "pdf",
        count: 50,
      }

      try {
        const data = await searchInFiction(options);
        data.results.forEach((result) => {
          assert.equal(result.format, "PDF");
        })
      } catch (error) {
        assert(false);
      }
    })

    it('should return an array with 50 results where extension is EPUB', async () => {
      const options = {
        mirror,
        query: 'dragon',
        extension: "epub",
        count: 50,
      }

      try {
        const data = await searchInFiction(options);
        data.results.forEach((result) => {
          assert.equal(result.format, "EPUB");
        })
      } catch (error) {
        assert(false);
      }
    })

    it('should return an array with 50 results where language is English', async () => {
      const options = {
        mirror,
        query: 'dragon',
        language: "en",
        count: 50,
      }

      try {
        const data = await searchInFiction(options);
        data.results.forEach((result) => {
          assert.equal(result.language, "English");
        })
      } catch (error) {
        assert(false);
      }
    })

    it('should return an array with 50 results where language is Spanish and format is EPUB', async () => {
      const options = {
        mirror,
        query: '',
        language: "es",
        extension: "mobi",
        count: 50,
      }

      try {
        const data = await searchInFiction(options);
        data.results.forEach((result) => {
          assert.equal(result.language, "Spanish");
          assert.equal(result.format, "MOBI");
        })
      } catch (error) {
        assert(false);
      }
    })
  })
})
