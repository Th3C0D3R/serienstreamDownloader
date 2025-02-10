const fs = require('fs');
const request = require('request');
const utils = require('./utils');

let EventEmitter = require('events').EventEmitter;
let eventEmitter = new EventEmitter();

let downloadOptions = {
    url: '',
    outputDir: '',
    outputFileName: new Date().getTime() + '.mp4',
    threadCount: 3,
    videoSuffix: '',
    videoUrlDirPath: '',
    headerReferrer: '',
    retryOnError: true,
    proxy: null,
    debug: false,
    useResumeDEBUG: false,
    forceReDownload: false
}


function loadM3u8(onLoad) {
    let options = {
        method: 'GET',
        url: downloadOptions.url,
        headers: {
            Referer: downloadOptions.headerReferrer
        },
        proxy: downloadOptions.proxy
    };
    request(options, (error, response, body) => {


        if (error || response.statusCode !== 200) {
            eventEmitter.emit('error', error);
            return
        }

        if (downloadOptions.debug) {
            console.log('M3u8 url res:', body);
        }

        let files = body.split('\n').filter(line => {
            let videoSuffix = downloadOptions.videoSuffix;

            return (
                line.trim() !== '' &&
                !line.startsWith('#') &&
                (!videoSuffix || line.endsWith(videoSuffix) || line.includes(videoSuffix + "?"))
            );
        }).map(line => {
            let videoUrlDirPath = downloadOptions.videoUrlDirPath;
            if (line.startsWith('http://') || line.startsWith('https://')) {
                return line;
            }
            return (videoUrlDirPath.endsWith("/")
                ? videoUrlDirPath
                : videoUrlDirPath + "/") + line.replace(/^\//, '');
        });

        onLoad(files)
    });
}

function downloadVideoFile(url) {
    return new Promise((resolve, reject) => {
        let proxy = downloadOptions.proxy;
        let headerReferrer = downloadOptions.headerReferrer;
        let outputDir = downloadOptions.outputDir;

        let options = {
            method: 'GET',
            url: url,
            encoding: null,
            headers: {
                Referer: headerReferrer
            },
            proxy
        };
        request(options, function (error, response) {
            if (error) {
                eventEmitter.emit('error', error);
                return reject(url)
            }
            // console.log(response.body);
            var regex = /\/([^\/?#]+\.ts)(?:[?#]|$)/;
            var match = url.match(regex);
            let fileName = match[1];
            fs.writeFileSync(outputDir + '/' + fileName, response.body);

            resolve();
        });
    })
}

let startTasks = (taskList, taskHandlePromise, progress = [0,0], limit = 3) => {
    let retryOnError = downloadOptions.retryOnError;

    let _runTask = (arr) => {
        //console.debug(`Counter: ${taskList.length - arr.length}`)
        eventEmitter.emit('progress', parseInt((taskList.length - arr.length) / taskList.length * 100));


        let _url = arr.shift();

        if (downloadOptions.debug) {
            console.log('Download fragment:', _url)
        }

        return taskHandlePromise(_url)
            .then(() => {
                utils.saveProgress(downloadOptions.outputDir, taskList.length - arr.length,downloadOptions.outputFileName);
                if (arr.length !== 0) return _runTask(arr)
            }).catch((item) => {
                if (retryOnError) {
                    arr.push(item)

                    return _runTask(arr)
                }

            })
    };

    let listCopy = [].concat(taskList);
    if (progress[1] > 0)
        listCopy = listCopy.slice(progress[1] - 1);
    let asyncTaskList = []
    while (limit > 0 && listCopy.length > 0) {
        asyncTaskList.push(_runTask(listCopy));
        limit--
    }

    return Promise.all(asyncTaskList);
}

function mergeFiles(list) {
    let outputDir = downloadOptions.outputDir;
    let outFile = outputDir + '/' + downloadOptions.outputFileName;

    if (fs.existsSync(outFile)) {
        fs.unlinkSync(outFile);
    }


    list.forEach(url => {
        var regex = /\/([^\/?#]+\.ts)(?:[?#]|$)/;
        var match = url.match(regex);
        let fileName = match[1];
        let result = fs.readFileSync(outputDir + '/' + fileName);
        fs.unlinkSync(outputDir + "/" + fileName);

        fs.appendFileSync(outFile, result)
    });

    eventEmitter.emit('complete', outFile)
}

function download(options) {
    setImmediate(() => {
        downloadOptions = Object.assign(downloadOptions, options);

        if (!downloadOptions.videoUrlDirPath) {
            downloadOptions.videoUrlDirPath = downloadOptions.url.substring(0, downloadOptions.url.lastIndexOf('/')) + '/';
        }

        if (!fs.existsSync(downloadOptions.outputDir)) {
            fs.mkdirSync(downloadOptions.outputDir, { recursive: true });
        }

        const lastDownloadedInfo = utils.getProgress(downloadOptions.outputDir);

        if (!downloadOptions.forceReDownload && fs.existsSync(downloadOptions.outputDir + '/' + downloadOptions.outputFileName)) {
            eventEmitter.emit('skipped', downloadOptions.outputFileName);
            return;
        }

        loadM3u8((list) => {
            if (downloadOptions.debug) {
                console.log('Ready download file list:', list);
            }

            eventEmitter.emit('progress', 0);
            // mergeFiles(list)

            startTasks(list, downloadVideoFile, lastDownloadedInfo, downloadOptions.threadCount).then(() => {
                eventEmitter.emit('downloaded', list);

                mergeFiles(list);
            })

        })

        eventEmitter.emit('start', downloadOptions);
    })
    return eventEmitter;
}

module.exports = { download };