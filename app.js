const express = require('express');
const { spawn } = require('child_process');
const http = require('http');
const path = require("path");
const fs = require("fs");
const WebSocket = require('ws');
const { LOCKFILE, QUEUEFILE } = require("./own_modules/utils");

const app = express();
const port = 3000;

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
            console.log(`[Downloader]: ${data.toString()}`);
        });

        child.stderr.on('data', (data) => {
            console.error(`[Downloader]: ${data.toString()}`);
        });

        child.unref();
    }

    res.sendFile(path.join(__dirname, 'index.html'));
});

// Redirect console logs/errors to WebSocket clients
function setupWebSocketLoggers() {
    const sendToClients = (type, message) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type, message }));
            }
        });
    };

    // Override console.log and console.error
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
        const message = args.join(' ');
        originalLog(message.replace("##LESS##", ""));
        sendToClients('log', message);
    };

    console.error = (...args) => {
        const message = args.join(' ');
        originalError(message.replace("##LESS##", ""));
        sendToClients('error', message);
    };
}

// Setup WebSocket loggers
setupWebSocketLoggers();

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
        console.log(`[Downloader]: ${data.toString()}`);
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

//clear progress



// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
