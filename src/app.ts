import { API_HASH, API_ID, BOT_TOKEN, CHANNEL_ID, MESSAGE_ID, SLUG_MAP, TITLE_MAP } from "./config";
import { connectDatabase } from "./database";
import AppInfo from "./database/AppInfo";
import logger from "./logger";
import { versionType } from "./types";
import { downloadLinkParser, fileDownloader, getAvailableVersions } from "./utils";
import fs from "fs";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { _parseMessageText } from "telegram/client/messageParse";
import moment from "moment";

(async () => {
  logger.info("starting wscaper");
  const client = new TelegramClient(new StringSession(""), API_ID, API_HASH, {
    connectionRetries: 5,
  });
  logger.info("starting telegram client");
  await client.start({
    botAuthToken: BOT_TOKEN,
  });
  await connectDatabase();

  var messageText = "**Whatsapp latest versions**";
  for (const slugInfo of SLUG_MAP) {
    let { all: allAvailableVersions, latestBeta, latestStable } = await getAvailableVersions(slugInfo.slug);
    messageText += `\n\n**${TITLE_MAP[slugInfo.title]}**`;
    if (latestStable) messageText += `\nStable    : \`${latestStable?.version}\``;
    if (latestBeta) messageText += `\nBeta    : \`${latestBeta?.version}\` beta`;

    var previousVersions: string[] = (await AppInfo.find({ variant: slugInfo.title }, { version: 1, _id: 0 })).map(
      (item: versionType) => item.version
    );

    var updatedVersions = allAvailableVersions.filter((val) => !previousVersions.includes(val.version)).reverse();
    // if (updatedVersions.length < 1) {
    //   logger.debug("no diff found so skipping");
    //   continue;
    // }

    logger.info(`found ${updatedVersions.length} release diffs (${slugInfo.title})`);

    for (const newVersion of updatedVersions) {
      const releaseInfo = await downloadLinkParser("whatsapp-inc", slugInfo.slug, newVersion.version);
      if (!releaseInfo) continue;
      logger.info(`downloading ${releaseInfo.filename}`);

      let caption = `**${
        /business/i.test(releaseInfo.title)
          ? "WhatsApp Business Android"
          : /wear/i.test(releaseInfo.title)
          ? "WhatsApp for Wear OS"
          : "Whatsapp Messenger Android"
      } ${/beta|alpha/.test(releaseInfo.title) ? "beta" : ""}**\nVersion: \`${releaseInfo.version} (${
        releaseInfo.versioncode
      })\`\nPublished on: \`${releaseInfo.date}\`\nMD5: \`${releaseInfo.md5}\``;

      let filePath = await fileDownloader(releaseInfo.url, releaseInfo.filename);
      logger.info(`file downloaded to  ${filePath} now uploading to telegram`);

      await client.sendFile(CHANNEL_ID, {
        file: filePath,
        forceDocument: true,
        workers: 12,
        caption: caption,
      });
      logger.debug("upload completed and now saving version info to database");

      await AppInfo.create({
        title: releaseInfo.title,
        version: releaseInfo.version,
        versionCode: releaseInfo.versioncode,
        variant: slugInfo.title,
        checksum: releaseInfo.md5,
        released_on: releaseInfo.date,
      });

      fs.unlinkSync(filePath);
      logger.debug("cleaning up downloaded file");
    }
  }

  messageText += `\n\nLast updated on: __${moment
    .utc(new Date())
    .utcOffset("+05:30")
    .format("DD/MM/YYYY HH:mm:ss [IST]")}__`;

  try {
    const [text, entities] = await _parseMessageText(client, messageText, "markdown");
    await client.invoke(
      new Api.messages.EditMessage({
        peer: CHANNEL_ID,
        id: MESSAGE_ID,
        message: text,
        entities: entities,
      })
    );
    console.log("edited telegram message");
  } catch (error) {
    logger.error(`message edit failed: ${error}`);
  }
  await client.disconnect();
  logger.warn("compeleted and exiting");
  process.exit();
})();
