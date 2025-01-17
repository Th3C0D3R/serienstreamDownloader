
const fs = require('fs');
const path = require('path');
const { download } = require('./downloader');
const { convertVideo } = require('./utils');
const { getProgress, PROGRESSFILE } = require('./utils');


async function downloadFiles(videoURLS, title, convert = false) {
    for (var u of videoURLS) {
        var filename = ""
        var doptions = {
            url: u[2],
            threadCount: 5,
            outputDir: `downloaded/${title}/Season 0${u[0]}`,
            videoUrlDirPath: u[2].split("index")[0],
            outputFileName: `S0${u[0]}E${u[1]}.ts`,
            useResumeDEBUG: true
        };
        var progress = getProgress(doptions.outputDir);
        if (u[1] < progress[0]) {
            continue;
        }
        await new Promise(async (resolve, reject) => {

            let listener = download(doptions);

            const onStart = function (options) {
                console.log("Download started: ", options.outputFileName);
            };

            const onSkip = function (options) {
                console.log("Download skipped: ", options.outputFileName);
            };

            const onProgress = function (percent) {
                console.log("##LESS##Progress:", percent);
            };

            const onDownloaded = function (list) {
                console.log("##LESS##Download finished: ", list);
            };

            const onComplete = function (outFile) {
                console.log("Done:", outFile);
                filename = outFile;

                if (fs.existsSync(path.join(doptions.outputDir, PROGRESSFILE))) {
                    fs.unlinkSync(path.join(doptions.outputDir, PROGRESSFILE));
                }

                listener.off('start', onStart);
                listener.off('skipped', onSkip);
                listener.off('progress', onProgress);
                listener.off('downloaded', onDownloaded);
                listener.off('complete', onComplete);
                listener.off('error', onError);
                resolve(); // Move to the next download
            };

            const onError = function (error) {
                console.error("Error:", error);
            };

            listener.on('start', onStart);
            listener.on('skipped', onSkip);
            listener.on('progress', onProgress);
            listener.on('downloaded', onDownloaded);
            listener.on('complete', onComplete);
            listener.on('error', onError);

        });
        convert && await convertVideo(filename, filename.replace(".ts", ".mp4"));
    }

}


// Export all utility functions
module.exports = {
    downloadFiles
};