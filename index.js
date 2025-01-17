
(async () => {
  var { JSDOM } = require('jsdom');
  const utils = require("./own_modules/utils");
  const fs = require("fs");
  const download_helper = require("./own_modules/download_helper");

  // Base URL of the site
  var originUrl = "https://s.to/";

  var seasonURL = process.argv.slice(2)[0] ?? null;
  var title = process.argv.slice(2)[1] ?? null;

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

  await download_helper.downloadFiles(result, title)
    .then(() => console.log("All downloads complete"))
    .catch(err => console.error("An error occurred:", err));

})()


