process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const { spawn } = require('child_process');

const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello World!');
});

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
        stdio: ['pipe'/* , 'pipe', 'pipe' */]
    });

    child.stdin.write(JSON.stringify({ seasonURL, title }));
    child.stdin.end();

     /* child.stdout.on('data', (data) => {
        console.log(`${data.toString()}`);
    });
    child.stderr.on('data', (data) => {
        console.error(`${data.toString()}`);
    });  */

    child.unref();

    res.status(200).json({ message: `Download started for title: ${title}` });

});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
