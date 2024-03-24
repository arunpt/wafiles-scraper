import { model, Schema } from "mongoose";
import { AppInfoInt } from "../types";
import moment from "moment";

export const AppInfo = new Schema({
  title: {
    type: String,
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  versionCode: {
    type: Number,
    required: true,
  },
  checksum: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    required: true,
  },
  time: {
    type: Number,
    default: () => moment().unix(),
  },
  released_on: {
    type: String,
    required: true,
  },
});

export default model<AppInfoInt>("AppInfo", AppInfo);
