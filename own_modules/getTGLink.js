const puppeteer = require('puppeteer');

process.stdin.on('data', async (data) => {
    require('dotenv').config();
    const { url } = JSON.parse(data.toString());

    const browser = await puppeteer.launch({headless:true, args: ['--no-sandbox', '--disable-setuid-sandbox']});

    const page = await browser.newPage();

    await page.goto(url);

    await page.waitForSelector('form[name="tp"]',{timeout: 10000});

    await page.evaluate(() => {
        const element = document.querySelector('form[name="tp"]');
        if (element && element.tagName === "FORM" && element.submit) {
            element.submit();
        }
    });

    await page.waitForSelector("#btn6",{timeout: 10000});

    await page.evaluate(() => {
        const element = document.querySelector("#btn6");
        if (element && element.click) {
            element.click();
        }
    });

    await page.waitForSelector('form[name="tp"]',{timeout: 10000});

    await page.evaluate(() => {
        const element = document.querySelector('form[name="tp"]');
        if (element && element.tagName === "FORM" && element.submit) {
            element.submit();
        }
    });

    await page.waitForSelector("#btn6",{timeout: 10000});

    await page.evaluate(() => {
        const element = document.querySelector("#btn6");
        if (element && element.click) {
            element.click();
        }
    });

    await page.waitForSelector("[href^='https://t.me/']",{timeout: 30000});

    var href = await page.evaluate(() => {
        const element = document.querySelector("[href^='https://t.me/']");
        if (element && element.href) {
            return element.href;
        }
        return "none";
    });

    await page.goto(href);
    await page.waitForSelector(".tgme_page_title",{timeout: 10000});

    var name = await page.evaluate(() => {
        const element = document.querySelector(".tgme_page_title");
        if (element && element.innerText) {
            return element.innerText;
        }
        return "none";
    });

    await browser.close();

    await fetch("https://api.telegram.org/bot"+process.env.TG_TOKEN+"/sendMessage", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            chat_id: process.env.TG_CHAT_ID,
            text: `Channel: ${name}\nLink: ${href}`
        })
    });

    
});

process.stdin.on('end', () => {

});