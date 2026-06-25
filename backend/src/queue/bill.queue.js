const { Queue } = require("bullmq");

const billQueue = new Queue("bill-processing", {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

module.exports = billQueue;
