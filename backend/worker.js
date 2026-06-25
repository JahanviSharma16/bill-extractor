require("dotenv").config();


const connectDB = require("./src/config/db");

connectDB();

require("./src/queue/worker");