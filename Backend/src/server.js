const http = require("http");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

dotenv.config();

const createApp = require("./app");
const connectDB = require("./config/db");
const setupSocket = require("./socket/setupSocket");

connectDB();

const app = createApp();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN },
});
app.set("io", io);

setupSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});