const puppeteer = require("puppeteer");
const Jimp = require("jimp");
const xml2js = require("xml2js");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const outputFolder = "./out/";

async function run(post) {
  const { url, name } = post;
  const imageName = path.join(outputFolder, name) + ".png";

  if (fs.existsSync(imageName)) {
    console.log(`${imageName} already exists`);
    return;
  }

  let browser = await puppeteer.launch({ headless: true });
  let page = await browser.newPage();
  await page.goto(url);

  let selector = ".default-container";
  await page.waitForSelector(selector);
  const logo = await page.$(selector);

  let scale = 4;
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: scale,
  });
  await logo.screenshot({ path: imageName, type: "png", fullpage: true });
  await page.close();
  await browser.close();

  let image = await Jimp.read(imageName);
  let w = image.getWidth();
  let h = image.getHeight();
  await image.crop(0, 27 * scale, w, h - 200 * scale);

  let padding = 200;
  let img = new Jimp(image.getWidth() + padding, image.getHeight(), "#000");
  img = await img.composite(image, padding / 2, 0, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacityDest: 1,
  });

  await img.writeAsync(imageName);
}
async function runAll() {
  const posts = await getPosts();
  for (let i = 0; i < posts.length; i++) {
    console.log(`processing ${posts[i].name} ${i}/${posts.length}`);
    await run(posts[i]);
  }
}

async function getPosts() {
  const resp = await axios.get("https://matt-rickard.com/sitemap-posts.xml");
  const xml = await xml2js.parseStringPromise(resp.data);
  return xml.urlset.url.map((u) => ({
    url: u.loc[0],
    name: `${formatDate(u.lastmod)}-${u.loc[0].split("/")[3]}`,
  }));
}

function formatDate(date) {
  return new Date(date).toISOString().split("T")[0];
}

runAll();
