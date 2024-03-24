import dotenv from "dotenv";

dotenv.config();

export const API_ID = Number(process.env.API_ID);
export const API_HASH = process.env.API_HASH;
export const CHANNEL_ID = Number(process.env.CHANNEL_ID);
export const MESSAGE_ID = Number(process.env.MESSAGE_ID);
export const BOT_TOKEN = process.env.BOT_TOKEN;

export const APK_MIRROR_BASE = "https://www.apkmirror.com";

export const SLUG_MAP = [
  {
    title: "android",
    slug: "whatsapp",
  },
  {
    title: "business",
    slug: "whatsapp-business",
  },
  {
    title: "wearOs",
    slug: "whatsapp-messenger-wear-os",
  },
];

export const TITLE_MAP = {
  android: "WhatsApp Messenger Android",
  business: "WhatsApp Business Android",
  wearOs: "WhatsApp for Wear OS",
};
