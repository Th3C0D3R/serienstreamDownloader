var { JSDOM } = require('jsdom');
const utils = require("./utils");
const fs = require("fs");
const download_helper = require("./download_helper");

process.stdin.on('data', async (data) => {

  const Update = { type: 'msg', message: data.toString() };
  process.stdout.write(JSON.stringify(Update) + '\n' );

  const { seasonURL, title, resume, queue, resume_queue } = JSON.parse(data.toString());

  if ((seasonURL === null || seasonURL === undefined) && !resume_queue) {
    console.error("No URL provided!");
    return;
  }

  if ((title === null ||title === undefined) && !resume_queue) {
    console.error("No title provided (used for naming output directory)");
    return;
  }

  utils.feature_flags.DOWNLOAD_QUEUE = queue;
  utils.feature_flags.RESUME_DOWNLOAD = resume;

  //check lockfile and add task into queue if present
  if (!fs.existsSync(utils.LOCKFILE)) {
    fs.writeFileSync(utils.LOCKFILE, "", { encoding: "utf-8" });
    if (!resume_queue)
      fs.appendFileSync(utils.QUEUEFILE, `${seasonURL}#${title};`);
  }
  else if (!utils.feature_flags.DOWNLOAD_QUEUE) {
    console.error("Download already running AND Queue Download turned OFF!");
    return;
  }
  else if (fs.existsSync(utils.LOCKFILE) && utils.feature_flags.DOWNLOAD_QUEUE && !resume_queue) {
    fs.appendFileSync(utils.QUEUEFILE, `${seasonURL}#${title};`);
    return;
  }
  var queueData = fs.readFileSync(utils.QUEUEFILE, { encoding: "utf-8" });
  var queueItems = queueData.split(";");

  await doTasks(queueItems);


  console.log(`Queue Download completed`);
  fs.unlinkSync(utils.LOCKFILE);
  fs.unlinkSync(utils.QUEUEFILE);
});

process.stdin.on('end', () => {
  const Update = { type: 'msg', message: '##LESS##Child process received all input data.'};
                process.stdout.write(JSON.stringify(Update) + '\n' );
});


async function doTasks(queueItems) {
  if (queueItems.length <= 0) return;
  var firstItem = queueItems[0].split("#");
  if (firstItem.length <= 0) return;
  if (firstItem[0].length <= 0 || firstItem[1].length <= 0) return;

  let seasonURL = firstItem[0];
  let title = firstItem[1];

  const Update = { type: 'msg', message: `Starting download for URL: ${seasonURL}, Title: ${title}` };
                process.stdout.write(JSON.stringify(Update) + '\n' );

  // Base URL of the site
  var originUrl = "https://s.to/";

  var html = await fetch(seasonURL);
  html = await html.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Select all episode links under the episodes list
  var episodeLinks = Array.from(document.querySelectorAll('ul > li > a[href*="episode"]'));

  // Extract and normalize the href attribute for each link
  var episodeUrls = episodeLinks
    .map(link => {
      var href = link.getAttribute('href');
      if (href.indexOf("/stream/") < 0) return null;
      return href.startsWith('http') ? href : originUrl + href.replace(/^\//, ''); // Ensure full URL
    })
    .filter(e => e);

  var videoURLS = [];
  var rURL = /<a\s+[^>]*class="[^"]*watchEpisode[^"]*"[^>]*href="([^"]*)"/i;
  var rMetaS = /<meta\s+itemprop="seasonNumber"\s+content="([^"]*)"/i;//
  var rMetaE = /<meta\s+itemprop="episode"\s+content="([^"]*)"/i;

  if (episodeUrls.length <= 0) {
    console.error(`Could not retrieve episode list from url: ${seasonURL}`);
    return;
  }

  var results = await Promise.all(
    episodeUrls.map(async url => {
      try {
        var response = await fetch(url);
        var body = await response.text();
        var matchURL = body.match(rURL);
        var matchS = body.match(rMetaS);
        var matchE = body.match(rMetaE);
        //if(matchE[1] == "1"){
          //fs.writeFileSync("body.html", body);
        //}

        if (matchURL && matchS && matchE) {
          return [matchS[1], matchE[1], originUrl + matchURL[1]];
        }
      } catch (error) {
        return null;
      }
      return null;
    })
  );

  videoURLS.push(...results.filter(e => e));

  if (videoURLS.length <= 0) {
    console.error("Could not retrieve video url!");
    return;
  }
  // Sort by the second item (episode number) in ascending order
  videoURLS.sort((a, b) => parseInt(a[1], 10) - parseInt(b[1], 10));

  const result = await utils.getIndexUrls(videoURLS);

  if (result.length <= 0) {
    console.error("no episode index.m3u8 not found!")
    return;
  }

  await download_helper.downloadFiles(result, title);

  console.log("Season downloads complete");
  console.log("Checking for more in QUEUE...");
  var queueData = fs.readFileSync(utils.QUEUEFILE, { encoding: "utf-8" });
  var queueItems = queueData.split(";");
  queueItems.shift();
  fs.writeFileSync(utils.QUEUEFILE, queueItems.join(";"));
  await doTasks(queueItems);
}