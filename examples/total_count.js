const libgen = require('../index.js');

(async () => {
  const options = {
    mirror: 'http://libgen.is',
    query: 'philosophy of science',
    count: 5
  }

  try {
    const data = await libgen.search(options)
    console.log(data.count +' results for "' + options.query + '"');
    return true
  } catch (err) {
    return console.error(err)
  }
})();
