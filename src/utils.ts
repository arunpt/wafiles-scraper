import axios, { AxiosResponse } from "axios";
import { load as CheerioLoad } from "cheerio";
import { APK_MIRROR_BASE } from "./config";
import logger from "./logger";
import moment from "moment";
import { DownloadLinkInfo } from "./types";
import Downloader from "nodejs-file-downloader";

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36";

export const fetchWebContent = async (url: string): Promise<any> => {
  const res: AxiosResponse<any> = await axios.get(url, {
    headers: {
      "user-agent": userAgent,
    },
  });
  return res.data;
};

export const getAvailableVersions = async (
  appUrlSlug: string
): Promise<{
  all: { title: string; version: string }[];
  latestBeta: { title: string; version: string } | undefined;
  latestStable: { title: string; version: string } | undefined;
}> => {
  logger.debug(`finding available versions of ${appUrlSlug}`);
  const appUrl = `${APK_MIRROR_BASE}/uploads/?appcategory=${appUrlSlug}`;
  const homePage = await fetchWebContent(appUrl);
  const $ = CheerioLoad(homePage);
  const appTitles = $('div.widget_appmanager_recentpostswidget div[class="appRow"] h5.appRowTitle');
  const availableVersions: { title: string; version: string }[] = [];
  for (const titleObj of appTitles) {
    let appTitle = titleObj.attribs?.title;
    let version = appTitle.match(/\d\.\d+\.\d+\.\d+/gm);
    if (!appTitle || !version) continue;
    availableVersions.push({
      title: appTitle,
      version: version[0],
    });
    // if (availableVersions.length >= 10) break;
  }
  let versionInfo = {
    all: availableVersions,
    latestBeta: availableVersions.find((item) => /beta|alpha/.test(item.title)),
    latestStable: availableVersions.find((item) => !/beta|alpha/.test(item.title)),
  };
  return versionInfo;
};

export const downloadLinkParser = async (
  org: string,
  slug: string,
  version: string
): Promise<DownloadLinkInfo | null> => {
  let formatedVersion = version.replace(/\./g, "-");
  var subSlug = slug == "whatsapp" ? "whatsapp-messenger" : slug;
  const srcUrl = `https://www.apkmirror.com/apk/${org}/${slug}-release/${subSlug}-${formatedVersion}-android-apk-download/`;
  var infoPage = await fetchWebContent(srcUrl);
  const $ = CheerioLoad(infoPage);
  var filename = $("#safeDownload > div > div > div.modal-body > h5:nth-child(1) > span").text().trim();
  var md5 = $("#safeDownload > div > div > div.modal-body > span:nth-child(13)").text();
  var publishedOn = $("div.apk-detail-table span.datetime_utc").text();
  var publishedOnIST = moment
    .utc(publishedOn, "MMMM D, YYYY [at] h:mmA [UTC]")
    .utcOffset("+05:30")
    .format("DD-MM-YYYY HH:mm:ss [IST]");
  var apkTitle = $("#masthead > header > div > div > div.f-grow > h1").text().trim();
  var versionCode = $("#variants > div > div > div:nth-child(2) > div:nth-child(1) > span:nth-child(6)").text();
  var downloadPageLink = $('a[class^="accent_bg btn btn-flat downloadButton"]').first().attr("href");
  if (!downloadPageLink) return null;
  const downloadPage = await fetchWebContent("https://www.apkmirror.com" + downloadPageLink);
  const parsedDownloadPage = CheerioLoad(downloadPage);
  var apkLink = parsedDownloadPage('a[rel="nofollow"]').first().attr("href");
  return {
    title: apkTitle,
    version: version,
    versioncode: Number(versionCode),
    url: "https://www.apkmirror.com" + apkLink,
    source: srcUrl,
    md5: md5,
    filename: filename.replace("_apkmirror.com", ""),
    date: publishedOnIST,
  };
};

export const fileDownloader = async (url: string, filename: string): Promise<string | null> => {
  const downloader = new Downloader({
    url: url,
    fileName: filename,
    headers: {
      "user-agent": userAgent,
    },
    cloneFiles: false,
  });
  try {
    await downloader.download();
    return filename;
  } catch (error) {
    logger.error(error);
    return null;
  }
};
