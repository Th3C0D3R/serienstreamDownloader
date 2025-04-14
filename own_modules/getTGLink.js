const puppeteer = require('puppeteer');

process.stdin.on('data', async (data) => {
    require('dotenv').config();
    const { url } = JSON.parse(data.toString());

    console.log("Launching Puppeteer");
    const browser = await puppeteer.launch({headless:true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
    
    const page = await browser.newPage();
    console.log(`GoTo: ${url}`);
    await page.goto(url);

    console.log(`WaitFor: form[name="tp"]`);
    await page.waitForSelector('form[name="tp"]',{timeout: 10000});

    console.log(`Evaluate Form Submit`);
    await page.evaluate(() => {
        const element = document.querySelector('form[name="tp"]');
        if (element && element.tagName === "FORM" && element.submit) {
            element.submit();
        }
    });

    console.log(`WaitFor: #btn6`);
    await page.waitForSelector("#btn6",{timeout: 10000});

    console.log(`Evaluate button click`);
    await page.evaluate(() => {
        const element = document.querySelector("#btn6");
        if (element && element.click) {
            element.click();
        }
    });

    console.log(`WaitFor: form[name="tp"]`);
    await page.waitForSelector('form[name="tp"]',{timeout: 10000});

    console.log(`Evaluate Form Submit`);
    await page.evaluate(() => {
        const element = document.querySelector('form[name="tp"]');
        if (element && element.tagName === "FORM" && element.submit) {
            element.submit();
        }
    });

    console.log(`WaitFor: #btn6`);
    await page.waitForSelector("#btn6",{timeout: 10000});

    console.log(`Evaluate button click`);
    await page.evaluate(() => {
        const element = document.querySelector("#btn6");
        if (element && element.click) {
            element.click();
        }
    });
    
    console.log(`WaitFor: [href^='https://t.me/']`);
    await page.waitForSelector("[href^='https://t.me/']",{timeout: 30000});

    console.log(`Get HREF Link`);
    var href = await page.evaluate(() => {
        const element = document.querySelector("[href^='https://t.me/']");
        if (element && element.href) {
            return element.href;
        }
        return "none";
    });

    console.log(`GoTo ${href}`);
    await page.goto(href);
    console.log(`WaitFor .tgme_page_title`);
    await page.waitForSelector(".tgme_page_title",{timeout: 10000});

    console.log(`Get Groupe Name`);
    var name = await page.evaluate(() => {
        let element = document.querySelector(".tgme_page_title");
        if (element && element.innerText) {
            return element.innerText;
        }
        return "none";
    });

    var image = await page.evaluate(()=>{
        let element = document.querySelector(".tgme_page_photo_image");
        if(element && element.src){
            return element.src;
        }
        return "none";
    })

    console.log(`Close Browser`);
    await browser.close();

    console.log(`Send Data: ${name} -> Link: ${href}`);
    await fetch("https://api.telegram.org/bot"+process.env.TG_TOKEN+"/sendMessage", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            parse_mode: 'markdown',
            chat_id: process.env.TG_CHAT_ID,
            text: `${(image != "none" ? "[‏](${image})\n" : "")}Channel: ${name}\nLink: ${href}`
        })
    });

    
});

process.stdin.on('end', () => {

});