## This nodeJS app downloads entire seasons from SerienStream.to 

## WIP AND STILL ACTIVE!

Either run `node app.js` as a express server and call `127.0.0.1:3000/downloadSeason?url={seasonurl}&title={title}` in your browser to start the download (without any visual info, FOR NOW, so WIP)

OR

run `node index.js` with both parameters, like: `node index.js "{url}" "{title}"` and have console output.

### CURRENT SUPPORTED SUB-HOSTER:
#### - VOE.sx

### TO-DO:
- [ ] More control for the node process (restart / force stop / clear output foler)
- [x] Reducing Console Output or add options for "less" and "verbose" logging
- [x] Adding possibility to queue multiple seasons for download
- [ ] Adding option to resume downloading


ITS STILL WIP and for educational purposes only

### Credits:
- m3u8-downloader by [reason211' m3u8-downloader](https://github.com/reason211/m3u8-downloader) (but modified by me)
- ChatGPT for optimizing :P