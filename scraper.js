require('dotenv').config()
const fs = require('fs');
const nfetch = require('node-fetch');
const cheerio = require('cheerio');
const Downloader = require("nodejs-file-downloader");
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");

const getWebContent = async (url, json = false) => {
    var request = await nfetch(url, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
        }
    });
    return json ? await request.json() : await request.text();
};

const waAndroidLink = async (apkMirrorUrl) => {
    var versionPage = await getWebContent(apkMirrorUrl);
    var parsedVersionPage = cheerio.load(versionPage);
    var versions = parsedVersionPage('h5[class="appRowTitle wrapText marginZero block-on-mobile"]').get();
    var availableVersions = [];
    for (let i = 0; i < 10; i++) {
        var version = versions[i].attribs.title;
        availableVersions.push({
            title: version,
            version: version.match(/\d\.\d+\.\d+\.\d+/gm)[0]
        });
    }
    // now lets check for updates by comparing this data with previous one
    var preVersions = await getWebContent('https://raw.githubusercontent.com/arunpt/archives/master/dummy.json', true)
    var updatedVersions = preVersions.versions.filter((item) => availableVersions.map(item => item.version).indexOf(item) === -1);
    var downloadLinks = { releases: [], versions: [] };
    for (let newVersion of updatedVersions) {
        let formatedVersion = newVersion.replace(/\./g, '-');
        let srcURL = `https://www.apkmirror.com/apk/whatsapp-inc/whatsapp/whatsapp-${formatedVersion}-release/whatsapp-messenger-${formatedVersion}-android-apk-download/`;
        const infoPage = await getWebContent(srcURL);
        const parsedInfoPage = cheerio.load(infoPage);
        // console.log(parsedInfoPage('#safeDownload > div > div > div.modal-body').text());
        var filename = parsedInfoPage('#safeDownload > div > div > div.modal-body > h5:nth-child(1) > span').text().trim();
        var md5 = parsedInfoPage('#safeDownload > div > div > div.modal-body > span:nth-child(13)').text();
        var publishedOn = parsedInfoPage('#file > div.row.d-flex.f-a-start > div:nth-child(1) > div > div:nth-child(7) > div.appspec-value > span').text();
        var downloadPageLink = parsedInfoPage('a[class^="accent_bg btn btn-flat downloadButton"]').first().attr('href');
        if (!downloadPageLink) continue;
        const downloadPage = await getWebContent('https://www.apkmirror.com' + downloadPageLink);
        const parsedDownloadPage = cheerio.load(downloadPage);
        var apkLink = parsedDownloadPage('a[rel="nofollow"]').first().attr('href');
        downloadLinks.releases.push({
            version: newVersion,
            link: 'https://www.apkmirror.com' + apkLink,
            source: srcURL,
            md5: md5,
            filename: filename.replace('_apkmirror.com', ''),
            date: publishedOn
        });
    }
    downloadLinks.versions = {
        stable: availableVersions.filter((item) => !/beta|alpha/.test(item.title)),
        beta: availableVersions.filter((item) => /beta|alpha/.test(item.title))
    };
    return downloadLinks;
};


const downloadFile = async (url, filename) => {
    const downloader = new Downloader({
        url: url,
        filename: filename,
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
        },
        cloneFiles: false,
    });
    try {
        await downloader.download();
        return filename;
    } catch (error) {
        console.log(error);
        return null
    }
}

(async () => {
    const apiId = process.env.API_ID;
    const apiHash = process.env.API_HASH;
    const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
        connectionRetries: 3,
    });
    await client.start({
        botAuthToken: process.env.BOT_TOKEN,
    });
    var androidData = await waAndroidLink('https://www.apkmirror.com/apk/whatsapp-inc/whatsapp/');
    console.log(androidData);
    fs.writeFileSync('releases.json', JSON.stringify({ android: androidData.versions }, null, 2));
    for (let release of androidData.releases) {
        let filePath = await downloadFile(release.link, release.filename);
        let caption = `__${release.filename}__\nVersion: \`${release.version}\`\nPublished on: \`${release.date}\`\nMD5: \`${release.md5}\``;
        await client.sendFile(process.env.CHANNEL_ID, { file: filePath, forceDocument: true, workers: 5, caption: caption });
        fs.unlinkSync(filePath);
    }
    await client.invoke(new Api.messages.EditMessage({
        peer: process.env.CHANNEL_ID,
        id: process.env.MESSAGE_ID,
        message: `Latest version:\n\nAndroid\nBeta: \`${androidData.versions.beta[0]}\`\nStable: \`${androidData.versions.stable[0]}\``,
    }));
})();