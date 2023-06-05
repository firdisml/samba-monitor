const Discord = require('discord.js');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const https = require('https')
const scheme = require('./schema/scheme');
const {comparer} = require('./comparer/comparer');

const client = new Discord.Client();

client.on("ready", async () => {

    console.log(`Logged in as ${client.user.tag}!`);

    //Set Bot Presence in Discord
    client.user.setPresence({
        status: "online",
        activity: {
            // The message shown
            name: `SAMBA`,
            // PLAYING, WATCHING, LISTENING, STREAMING
            type: "WATCHING"
        }
    });



    //Connecting to mongo db
    mongoose.connect(`mongodb://mongo:rcWtYcIH6ecnj8z5jBy5@containers-us-west-199.railway.app:6008`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    }).then(

        () => {
            //Tell Database is Connected
            console.log('Database is connected')
            //Set interval of scraping
            setInterval(ScrapSite, 60000);
        }, //If cannot connect to database
        err => {
            //Tell Database is no connected 
            console.log('Can not connect to the database' + err)
        }
    );

});

//Page Scroller
async function scroll(page){
    await page.evaluate(async () => {
        await new Promise(resolve => {
            // Adjust as necessary
            const y = 500, speed = 10;
            let heightScrolled = 0;

            setInterval(() => {
                window.scrollBy(0, y);
                heightScrolled += y;
                if (heightScrolled >= document.body.scrollHeight) {
                    resolve();
                }
            }, speed);
        });
    });
}


//Scrap Site
function ScrapSite() {

    //Pupetter 
    (async function Search() {

        try {

            //Set Flag value to check same data insertion
            let flag=false

            //Launch Browser
            const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
            const [page] = await browser.pages();

            //Set Headers
            await page.setExtraHTTPHeaders({
            'user-agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36`
            });

            //Request URL
            await page.goto(`https://www.jdsports.my/search/samba/`, {
            //Setting
            waitUntil: 'networkidle0',
            timeout:0
            });

            //Parse HTML
            const html = await page.evaluate(() => document.querySelector('*').outerHTML);
            
            //Close page
            await page.close();
                    
            //Close browser
            await browser.close();
            
            //Cheerio 
            let $ = cheerio.load(html);

            //Parent Product Array
            let products = [];

            //Child Product Array
            let productNames = [];
            let links = [];

            //Scrap Product Title
            $('.itemTitle').each((i, el) => {
                productNames[i] = $(el).children('a').text().toUpperCase();
            });

            //Scrap Link
            $('.itemTitle').each((i, el) => {
                links[i] = 'https://www.jdsports.my' + $(el).children('a').attr('href');
            });

            //Store all products data in an array
            for (let i = 0; i < productNames.length; i++) {
                products.push({
                    'product_name': productNames[i],
                    'link': links[i]
                });
            }

            //Take data fron mango DB to compare
            let data = []

            //Fetching all the previous data from mongoDB
            try {
                data = await scheme.find({}, '-_id -__v');
            }
            //If error fetching data from mongodb
            catch (err) {
                console.log("Unable to query the database", err)
            }

            let ProductData = {products:data}

            //Compare data in website and db
            let Products = comparer(products, ProductData.products);

            //If no new product detected
            if (Products.length < 1 || Products.length == 0 ) {

            } 
            else {
                //If new product detected
                if (Products.length > 0) {
                
                    for (let i = 0; i < Products.length; i++) {
                        //Add element
                        const element = Products[i];
                        
                        //Add datas into embed fields
                        const productEmbed = new Discord.MessageEmbed()
                            //Set Author
                            .setAuthor(`JDSPORT (SAMBA)`, "https://cdn.freebiesupply.com/logos/large/2x/jd-sports-logo-png-transparent.png", `https://www.jdsports.my/search/samba/`)
                            //Set message color
                            .setColor("#f1c40f")
                            //Set message title
                            .setTitle((`${Products[i].product_name}`).toUpperCase())
                            //Set message url
                            .setURL(`${Products[i].link}`)
                            //Set message thumbnail
                            .setThumbnail(`https://cdn.freebiesupply.com/logos/large/2x/jd-sports-logo-png-transparent.png`)
                            //Set message Fields
                            .addFields(
                                { 
                                    name: 'Category:', 
                                    value: `SAMBA`, 
                                    inline:true 
                                },
                                { 
                                    name: 'Region:', 
                                    value: `MALAYSIA`, 
                                    inline:true 
                                },
                                { 
                                    name: 'Other Links:', 
                                    value: "[Cart]"+`(https://www.jdsports.my/search/samba/)` + " | " + "[Checkout]" + "(https://www.jdsports.my)" + " | " + "[Home]" + "(https://www.jdsports.my)" + " | " + "[Sale]" + "(https://www.jdsports.my/sale/)"
                                }
                            )
                            .setTimestamp()
                            .setFooter(`Daus Hensem`, `https://cdn.freebiesupply.com/logos/large/2x/jd-sports-logo-png-transparent.png`);

                        //Check if same unique data exist
                        let d = await scheme.find({link: element.link});

                        //Check Link
                        if (d && d.length==0){
                            
                            if (client.channels.cache.get(`1114939158536912916`)){
                                //Try to insert data into MongoDB and send to discord
                                try{
                                    //Insert Data into MongoDB
                                    await scheme.insertMany([element])
                                    
                                    //Post Message to  Discord channel
                                    client.channels.cache.get(`1114939158536912916`).send(productEmbed);

                                    //Set Flag to true
                                    flag=true
                                }
                                //Catch Errors inserting data
                                catch(e){
                                }
                            }
                        }
                    }
                    //Print Result
                    if (flag){
                    }
                    else{
                    }
                }
            }
        //If there is an error going to the website, etc
        } catch (err) {
            //If error occured
            console.error(err);
        }
    })();
}
//Discord Bot Token
client.login(`MTExNDkzMjk0NTc0MDg5ODMwNA.G5uxNj.JjGnVmTONBRrUnQnkpT8g3otQOVd33lPgSoakM`);
