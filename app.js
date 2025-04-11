const express = require('express');
const { spawn } = require('child_process');
const http = require('http');
const path = require("path");
const readline = require('readline')
const fs = require("fs");
const WebSocket = require('ws');
const { LOCKFILE, QUEUEFILE } = require("./own_modules/utils");

const app = express();
const port = 3000;

const sendToClients = (type, message) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, message }));
        }
    });
};

function logger (type, message){
    process.stdout.write(message)
    sendToClients(type, message)
}

// Create an HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

if (fs.existsSync(LOCKFILE)) {
    fs.unlinkSync(LOCKFILE);
}
/* if(fs.existsSync(QUEUEFILE)){    
    fs.unlinkSync(QUEUEFILE);
} */

let resume_queue = false;

// Serve static HTML file
app.get('/', (req, res) => {

    if (fs.existsSync(QUEUEFILE)) {

        const child = spawn('node', ['./own_modules/downloadAsProcess.js'], {
            detached: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        child.stdin.write(JSON.stringify({ seasonURL: undefined, title: undefined, resume: false, queue: true, resume_queue: true }));
        child.stdin.end();

        // Redirect child process logs to WebSocket
        child.stdout.on('data', (data) => {
            const messages = data.toString().split('\n'); // Split by newline to handle multiple messages
            messages.forEach(message => {
                if(message){ //prevent empty messages
                    try {
                        const parsedData = JSON.parse(message);
                        switch(parsedData.type){
                            case "progress":
                                readline.clearLine(process.stdout, 0);
                                readline.cursorTo(process.stdout, 0);
                                 logger('log',`[Downloader]: Progress: ${parsedData.percentage}%\r`)
                                break;
                            case "start":
                                logger('log',`[Downloader]: Started: ${parsedData.message.outputFileName}\n`);
                                break;
                            case "skip":
                                logger('log',`[Downloader]: Skipped: ${parsedData.message.outputFileName}\n`);
                                break;
                            case "pull":
                                logger('log',`[Downloader]: Pulling: ${parsedData.message}\n`);
                                break;

                            case "done":
                                logger('log',`[Downloader]: Done: ${parsedData.message}\n`);
                                break;
                            case "msg":
                                    logger('log',`[Downloader]: ${parsedData.message}\n`);
                                    break;
                            default:
                                console.log(`[Downloader]: ${JSON.stringify(message)}`); 
                        }
                            
                    } catch (error) {
                        console.error("Error parsing JSON:", error);
                        console.log(`[Downloader]: ${JSON.stringify(message)}`); // If JSON parsing fails, log as regular message
                    }
                }
            })
        });
        child.stderr.on('data', (data) => {
            console.error(`[Downloader]: ${data.toString()}`);
        });

        child.unref();
    }

    res.sendFile(path.join(__dirname, 'index.html'));
});


app.get('/downloadSeason', (req, res) => {
    if (req.query["url"] === undefined) {
        return res.status(400).json({ error: "SerienStream URL is missing!" });
    }
    if (req.query["title"] === undefined) {
        return res.status(400).json({ error: "Title of the Stream is missing!" });
    }
    let resume = req.query["resume"] !== undefined;
    let queue = req.query["queue"] !== undefined;

    var seasonURL = req.query["url"].trim();
    var title = req.query["title"].trim();

    const child = spawn('node', ['./own_modules/downloadAsProcess.js'], {
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    child.stdin.write(JSON.stringify({ seasonURL, title, resume, queue, resume_queue }));
    child.stdin.end();

    // Redirect child process logs to WebSocket
    child.stdout.on('data', (data) => {
        const messages = data.toString().split('\n'); // Split by newline to handle multiple messages
        messages.forEach(message => {
            if(message){ //prevent empty messages
                try {
                    const parsedData = JSON.parse(message);
                    switch(parsedData.type){
                        case "progress":
                            readline.clearLine(process.stdout, 0);
                            readline.cursorTo(process.stdout, 0);
                             logger('log',`[Downloader]: Progress: ${parsedData.percentage}%\r`)
                            break;
                        case "start":
                            logger('log',`[Downloader]: Started: ${parsedData.message.outputFileName}\n`);
                            break;
                        case "skip":
                            logger('log',`[Downloader]: Skipped: ${parsedData.message.outputFileName}\n`);
                            break;
                        case "pull":
                            logger('log',`[Downloader]: Pulling: ${parsedData.message}\n`);
                            break;

                        case "done":
                            logger('log',`[Downloader]: Done: ${parsedData.message}\n`);
                            break;
                        case "msg":
                                logger('log',`[Downloader]: ${parsedData.message}\n`);
                                break;
                        default:
                            console.log(`[Downloader]: ${JSON.stringify(message)}`); 
                    }
                        
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    console.log(`[Downloader]: ${JSON.stringify(message)}`); // If JSON parsing fails, log as regular message
                }
            }
        })
    });

    child.stderr.on('data', (data) => {
        console.error(`[Downloader]: ${data.toString()}`);
    });

    child.unref();

    res.status(200).json({ message: `Download started for title: ${title}` });

});


app.get('/clearQueue', (req, res) => {
    if (fs.existsSync(QUEUEFILE)) {
        fs.unlinkSync(QUEUEFILE);
        res.status(200).json({ message: "Queue cleared!" });
    }
});

app.get('/getTelegramLink', (req, res) => {

    if (req.query["url"] === undefined || req.query["url"].length <= 0) {
        return res.status(400).json({ error: "url=[url] is missing!" });
    }

    var url = req.query["url"].trim();

    const child = spawn('node', ['./own_modules/getTGLink.js'], {
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    child.stdin.write(JSON.stringify({ url}));
    child.stdin.end();

    child.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
        console.error(`[Downloader]: ${data.toString()}`);
    });

    res.status(200).json({ message: `Scrapper started for url: ${url}` });
});


// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
