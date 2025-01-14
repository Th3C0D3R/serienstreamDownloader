// Import required modules
const hbjs = require('handbrake-js');
const downloader = require('./downloader');

// Convert a video using HandBrake
async function convertVideo(input, output) {
    return new Promise((resolve, reject) => {
        hbjs
            .spawn({ input, output })
            .on('error', (err) => reject(err))
            .on('progress', (progress) => {
                console.log(
                    'Percent complete: %s, ETA: %s',
                    progress.percentComplete,
                    progress.eta
                );
            })
            .on('end', () => resolve());
    });
}

async function downloadFiles(videoURLS, title, convert = false) {
    for (var u of videoURLS) {
        var filename = ""
        await new Promise(async (resolve, reject) => {
            var doptions = {
                url: u[2],
                outputDir: `${title}/Season 0${u[0]}`,
                videoUrlDirPath: u[2].split("index")[0],
                outputFileName: `S0${u[0]}E${u[1]}.ts`
            };
            let listener = downloader.download(doptions);

            const onStart = function (options) {
                console.log("Started downloading:", options);
            };

            const onProgress = function (percent) {
                console.log("Progress:", percent);
            };

            const onDownloaded = function (list) {
                console.log("Downloaded:", list);
            };

            const onComplete = function (outFile) {
                console.log("Done:", outFile);
                filename = outFile;
                listener.off('start', onStart);
                listener.off('progress', onProgress);
                listener.off('downloaded', onDownloaded);
                listener.off('complete', onComplete);
                listener.off('error', onError);
                resolve(); // Move to the next download
            };

            const onError = function (error) {
                console.error("Error:", error);
                listener.off('start', onStart);
                listener.off('progress', onProgress);
                listener.off('downloaded', onDownloaded);
                listener.off('complete', onComplete);
                listener.off('error', onError);
                reject(error); // Stop the loop on error
            };

            listener.on('start', onStart);
            listener.on('progress', onProgress);
            listener.on('downloaded', onDownloaded);
            listener.on('complete', onComplete);
            listener.on('error', onError);

        });
        convert && await convertVideo(filename,filename.replace(".ts",".mp4"));
    }

}

async function getIndexUrls(videoURLS) {
    const indexUrls = [];

    for (const u of videoURLS) {
        try {
            // Redirect URL
            const redRegex = /window\.location\.href\s*=\s*'([^']+)'/;
            const redResponse = await fetch(u[2]);
            const redBody = await redResponse.text();
            const redUrl = redBody.match(redRegex)?.[1];
            if (!redUrl) throw new Error("Redirect URL not found");

            // Fetch HLS Master URL
            const hlsRegex = /'hls':\s*'([^']+)'/;
            const hlsResponse = await fetch(redUrl);
            const hlsBody = await hlsResponse.text();
            const masterURL = atob(hlsBody.match(hlsRegex)?.[1]);
            if (!masterURL) throw new Error("HLS URL not found");

            // Fetch index.m3u8 URL
            const masterResponse = await fetch(masterURL);
            const masterBody = await masterResponse.text();
            const indexPath = masterBody.split("\n").find((line) => line.startsWith("index"));
            if (!indexPath) throw new Error("Index.m3u8 path not found");

            const baseMasterUrl = masterURL.split("master")[0];
            const indexUrlComplete = baseMasterUrl + indexPath;
            console.log(`pulling episode ${u[1]}`);
            indexUrls.push([u[0], u[1], indexUrlComplete]);
        } catch (error) {
            console.error("Error processing URL: ", u, error.message);
        }
    }

    return indexUrls;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export all utility functions
module.exports = {
    convertVideo,
    downloadFiles,
    getIndexUrls,
    sleep,
};
