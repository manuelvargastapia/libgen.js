const libgen = require('../index.js');

(async () => {
  const options = {
    mirror: 'http://libgen.rs',
    ids: '430,86' // could also be ["430", "86"]
  }

  try {
    const data = await libgen.search(options)
    let n = data.length;
    console.log('top ' + n + ' results for "' +
                options.query + '"' + ' seaching by ids ' + options.ids.toString());
    while (n--){
      console.log('***********');
      console.log('Title: ' + data[n].title);
      console.log('Author: ' + data[n].author);
      console.log('Download: ' +
                  'http://gen.lib.rus.ec/book/index.php?md5=' +
                  data[n].md5.toLowerCase());
    }
    return true
  } catch (err) {
    return console.error(err)
  }
})();