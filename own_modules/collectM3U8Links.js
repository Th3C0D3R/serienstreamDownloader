const puppeteer = require('puppeteer');

process.stdin.on('data', async (data) => {

    const { url } = JSON.parse(data.toString());

    console.log("Launching Puppeteer");
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    const page = await browser.newPage();

    console.log(`GoTo: ${url}`);
    var promRes;
    var promWait = new Promise((res, _) => promRes = res);
    var masterURL = [];
    page.on('response', response => {
        var url = response.url();
        if (url.indexOf("master.m3u8") >= 0) {
            masterURL.push(url);
        }
    });
    await page.goto(redUrl,{waitUntil:'networkidle0'});
    await promWait;
});

process.stdin.on('end', () => {

});