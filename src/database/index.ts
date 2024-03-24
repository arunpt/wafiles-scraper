import { connect } from "mongoose";
import logger from "../logger";

export const connectDatabase = async () => {
  await connect(process.env.MONGO_URI, { dbName: "wasc" });
  logger.info("Database Connected!");
};
