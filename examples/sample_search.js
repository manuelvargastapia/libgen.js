const libgen = require('../index.js');

(async () => {
  const options = {
    mirror: 'http://libgen.is',
    query: 'philosophy of religion',
    count: 5
  }

  try {
    const data = await libgen.search(options)
    let n = data.results.length;
    console.log('top ' + n + ' results for "' +
                options.query + '"');
    while (n--){
      console.log('***********');
      console.log('Title: ' + data.results[n].title);
      console.log('Author: ' + data.results[n].author);
      console.log('Download: ' +
                  'http://gen.lib.rus.ec/book/index.php?md5=' +
                  data.results[n].md5.toLowerCase());
    }
    return true
  } catch (err) {
    return console.error(err)
  }
})();
