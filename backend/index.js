import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

import connectDB from "./lib/db.js";
import userRoutes from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

//Connect to db
connectDB();

const app = express();
const rootDir = path.resolve();

const server = http.createServer(app);

//Initialize socket.io server
export const io = new Server(server, {
  cors: {
    origin: "https://mern-chat-app-1-pmd3.onrender.com",
    credentials: true,
  },
});

//Store online users
export const userSocketMap = {}; //{userId : socket}

//Socket.io connect handler
io.on("connection", (socket) => {
  const userId = socket.handshake.auth.userId;
  console.log("User connected", userId);

  if (userId) userSocketMap[userId] = socket.id;

  //Emit online users to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("User disconnected", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

//Middleware setup
app.use(express.json({ limit: "50mb" }));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

//Routes
app.use("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRoutes);
app.use("/api/messages", messageRouter);

const PORT = process.env.PORT;

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(rootDir, "/frontend/dist")));
  app.get("/*", (req, res) => {
    res.sendFile(path.resolve(rootDir, "frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => console.log(`Server is listening to ${PORT}`));

export default server;
