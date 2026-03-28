const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

// ✅ connect DB ONLY ONCE
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

const server = require("http").createServer(app);

const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

// attach socket to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/pickup", require("./routes/pickupRoutes"));

// start server
server.listen(5000, () => {
  console.log("🚀 Server running on 5000");
});