# App to downloads entire seasons from SerienStream.to (s.to)

## WIP AND STILL ACTIVE!

Either run `node app.js` as a express server and call `127.0.0.1:3000/downloadSeason?url={seasonurl}&title={title}` or visit `127.0.0.1:3000/` in your browser to enter it yourself and have visual progress. Also adding multiple downloads in queue if a download is already running.

OR

run `node index.js` with both parameters, like: `node index.js "{url}" "{title}"` and have console output.

## Features:
- download any TV series available on s.to if the hoster voe.sx is available
- queue downloads to make you work automatically
- resume downloads when server restarted
- run it as a web server to make it accessible from everywhere
- retry on error while downloading segments

## Restrictions (subject to change):
- only downloads the first, by default selected language
- only works for videos AVAILABLE and hosted at voe.sx as of 16.01.2025


## CURRENT SUPPORTED SUB-HOSTER:
#### - VOE.sx

## TO-DO:
- [ ] More control for the node process (restart / force stop / clear output foler)
- [x] Reducing Console Output or add options for "less" and "verbose" logging
- [x] Adding possibility to queue multiple seasons for download
- [x] Adding option to resume downloading


ITS STILL WIP and for educational purposes only

## Credits:
- m3u8-downloader by [reason211' m3u8-downloader](https://github.com/reason211/m3u8-downloader) (but modified by me)
- ChatGPT for optimizing :P