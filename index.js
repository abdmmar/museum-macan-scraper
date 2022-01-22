import fs from 'fs'
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'
]

const getCollections = async (url) => {
  console.info(`Fetching ${url}...`)

  const response = await fetch(url, {headers: {'user-agent': userAgents[Math.floor(Math.random() * userAgents.length)]}})
  const html = await response.text()
  const $ = cheerio.load(html)

  console.info(`Extracting...`)

  const descRaw = $('.c_desc').html()
  const desc = descRaw?.replace('<p class="c_desc body">', '')?.replace('</p>', '')?.split('<br>')
  const media = desc?.at(0)?.replace('\u00A0', ' ')?.replace('&nbsp;', ' ')
  const size = desc?.at(1)

  const collection = {
    artist: $('.c_artist').text(),
    title: $('.c_title').text()?.replace('\u00A0', ' ')?.replace('&nbsp;', ' '),
    media: media,
    size: size,
    image: $('.incollection_img > img')?.attr('data-src') ,
    image_caption: $('.incollection_caption')?.text(),
    link: url
  }

  return collection
}

(async () => {
  const collections = []
  const collectionsUrl = JSON.parse(fs.readFileSync('./museum-macan-url.json'))
  const collectionsCache = JSON.parse(fs.readFileSync('./museum-macan-cache.json'))
  
  for(let i = 0; i < collectionsUrl.length; i++) {  
    const url = collectionsUrl[i]
    const collectionCache = collectionsCache[i]

    if(collectionCache?.link === url) {
      console.info(`${url} already in cache!`)
      collections.push(collectionCache)
    } else {
      const collection = await getCollections(url)

      console.info('Adding collection...')
      collections.push(collection)

      console.info('Caching...')
      fs.writeFileSync(`./collections/cache.json`, JSON.stringify(collections, null, 2))

      console.info(`Sleeping for 7 seconds...`)
      await sleep(7500)
    }
  }
  
  console.info('Writing collections.json...')
  fs.writeFileSync(`./museum-macan-collections.json`, JSON.stringify(collections, null, 2))
  
  console.info('Finish!')
})()

const extractSitemap = () => {
  const sitemap = JSON.parse(fs.readFileSync('./museum-macan-sitemap.json'))
  const collectionUrl = sitemap?.urlset?.url?.map(url => {
    const link = url.loc

    if(link.includes('collections')) {
      const regex = /(\?lang=)([a-z]{2})/g
      const linkReplaced = link.replace(regex, '')
      return linkReplaced
    }
  })
  
  fs.writeFileSync('./museum-macan-url.json', JSON.stringify(Array.from(new Set(collectionUrl)), null, 2))
}