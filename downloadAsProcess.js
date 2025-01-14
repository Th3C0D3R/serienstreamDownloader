process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

process.stdin.on('data', async (data) => {
  var { JSDOM } = require('jsdom');
  const utils = require("./utils");
  const fs = require("fs");
  const path = require("path");

  var lockFile = path.join(__dirname,".running");
  if(fs.existsSync(lockFile)){
    console.error("Process already running! CURRENTLY ONLY SINGLE-THREAD WORK");
  }
  else{
    fs.writeFileSync(lockFile,"",{encoding:"utf-8"});
  }

  const { seasonURL, title } = JSON.parse(data.toString());

  console.log(JSON.parse(data.toString()));
  console.log(`Starting download for URL: ${seasonURL}, Title: ${title}`);

  // Base URL of the site
  var originUrl = "https://s.to/";

  if (seasonURL === null) {
    console.error("No URL provided!");
    return;
  }

  if (title === null) {
    console.error("No title provided (used for naming output directory)");
    return;
  }

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

  await utils.downloadFiles(result, downloader, title)
    .then(() => console.log("All downloads complete"))
    .catch(err => console.error("An error occurred:", err));
});

process.stdin.on('end', () => {
  console.log('Child process received all input data.');
});
