// Import required modules

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");


function getProgress(folderPath) {
    if (fs.existsSync(path.join(folderPath, PROGRESSFILE))) {
        try {
            const progress = fs.readFileSync(path.join(folderPath, PROGRESSFILE), 'utf8');
            return progress.split(':').map(p => parseInt(p, 10) || 0);
        } catch (error) {
            fs.unlinkSync(path.join(folderPath, PROGRESSFILE));
            return [0, 0];
        }
    }
    return [0, 0];
}

function saveProgress(folderPath, segmentIndex, episodeString) {
    try {
        let episodeIndex = getEpisodeNumber(episodeString) ?? 0;
        fs.writeFileSync(path.join(folderPath, PROGRESSFILE), `${episodeIndex.toString()}:${segmentIndex.toString()}`, { encoding: 'utf8', flag: 'w' });
    } catch (error) {
        console.error('##LESS##Error saving progress: ', error);
    }
}

function getEpisodeNumber(fileName) {
    const match = fileName.match(/S\d+E(\d+)\.mp4/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return undefined;
}

async function getIndexUrls(videoURLS) {
    const indexUrls = [];
    const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
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
            var masterURL = "";
            try {
                masterURL = atob(hlsBody.match(hlsRegex)?.[1]);
            } catch (error) {
                
                const page = await browser.newPage();
                var promRes;
                var promWait = new Promise((res, _) => promRes = res);
                page.on('response', response => {
                    var url = response.url();
                    if (url.indexOf("master.m3u8") >= 0) {
                        masterURL = url;
                        promRes();
                    }
                });
                await page.goto(redUrl);
                await promWait;
                page.close();
            }
            if (!masterURL) throw new Error("HLS URL not found");

            // Fetch index.m3u8 URL
            const masterResponse = await fetch(masterURL);
            const masterBody = await masterResponse.text();
            const indexPath = masterBody.split("\n").find((line) => line.startsWith("index"));
            if (!indexPath) throw new Error("Index.m3u8 path not found");

            const baseMasterUrl = masterURL.split("master")[0];
            const indexUrlComplete = baseMasterUrl + indexPath;
            const Update = { type: 'pull', message: u[1] };
            process.stdout.write(JSON.stringify(Update) + '\n');
            indexUrls.push([u[0], u[1], indexUrlComplete]);
        } catch (error) {
            console.error("Error processing URL: ", u, error.message);
        }
    }
    browser.close();
    return indexUrls;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const feature_flags = {
    MULTI_THREADING: false,
    DOWNLOAD_QUEUE: false,
    RESUME_DOWNLOAD: false
}


const LOCKFILE = path.join(__dirname, ".running");
const QUEUEFILE = path.join(__dirname, ".queue");
const PROGRESSFILE = ".progress";

// Export all utility functions
module.exports = {
    saveProgress,
    getProgress,
    getIndexUrls,
    sleep,
    feature_flags,
    LOCKFILE,
    QUEUEFILE,
    PROGRESSFILE
};
