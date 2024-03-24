import winston from "winston";

export default winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  format: winston.format.cli(),
  transports: [new winston.transports.Console()],
});
