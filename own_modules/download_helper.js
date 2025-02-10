
const fs = require('fs');
const path = require('path');
const { download } = require('./downloader');
const { getProgress, PROGRESSFILE } = require('./utils');


async function downloadFiles(videoURLS, title) {
    for (var u of videoURLS) {
        var filename = ""
        var doptions = {
            url: u[2],
            threadCount: 5,
            outputDir: `downloaded/${title}/Season 0${u[0]}`,
            videoUrlDirPath: u[2].split("index")[0],
            outputFileName: `S0${u[0]}E${u[1]}.mp4`,
            useResumeDEBUG: true
        };
        var progress = getProgress(doptions.outputDir);
        if (u[1] < progress[0]) {
            continue;
        }
        await new Promise(async (resolve, reject) => {

            let listener = download(doptions);

            const onStart = function (options) {
                const Update = { type: 'start', message: options };
                process.stdout.write(JSON.stringify(Update) + '\n' );
            };

            const onSkip = function (options) {
                const Update = { type: 'skip', message: options };
                process.stdout.write(JSON.stringify(Update) + '\n' );
            };

            const onProgress = function  (percentage) {
                const progressUpdate = { type: 'progress', percentage };
                process.stdout.write(JSON.stringify(progressUpdate) + '\n' );
            }

            const onDownloaded = function (list) {
                const Update = { type: 'downloaded', message: list };
                process.stdout.write(JSON.stringify(Update) + '\n' );
            };

            const onComplete = function (outFile) {
                //filename = outFile.replace(".ts", ".mp4");
                fs.rename(outFile, filename,
                () => {
                    const Update = { type: 'done', message: filename };
                    process.stdout.write(JSON.stringify(Update) + '\n' );
                });

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
        
    }

}


// Export all utility functions
module.exports = {
    downloadFiles
};