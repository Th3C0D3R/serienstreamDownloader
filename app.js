const express = require('express');
const { spawn } = require('child_process');
const http = require('http');
const path = require("path")
const WebSocket = require('ws');

const app = express();
const port = 3000;

// Create an HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static HTML file
app.get('/', (req, res) => {
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
        originalLog(message);
        sendToClients('log', message);
    };

    console.error = (...args) => {
        const message = args.join(' ');
        originalError(message);
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

    var seasonURL = req.query["url"];
    var title = req.query["title"];

    const child = spawn('node', ['downloadAsProcess.js'], {
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe' ]
    });

    child.stdin.write(JSON.stringify({ seasonURL, title }));
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


// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
