require("dotenv").config();
const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.route");
const ticketRoutes = require("./routes/ticket.route");
const auth = require("./middlewares/auth.middleware");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Rate limit: max 5 tickets per IP per minute
const ticketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many requests. Please wait before taking another ticket." }
});

// inject socket
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);

const configPath = path.join(__dirname, "../storage/app-config.json");
const defaultConfig = { businessName: process.env.BUSINESS_NAME || "Smart Queue" };

const readAppConfig = () => {
  try {
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
      return defaultConfig;
    }
    const data = fs.readFileSync(configPath, "utf8");
    return { ...defaultConfig, ...JSON.parse(data || "{}") };
  } catch {
    return defaultConfig;
  }
};

app.get("/api/config", (req, res) => {
  res.json(readAppConfig());
});

app.put("/api/config", auth, (req, res) => {
  const businessName = String(req.body?.businessName || "").trim();
  if (!businessName) {
    return res.status(400).json({ error: "Business name is required" });
  }
  if (businessName.length > 80) {
    return res.status(400).json({ error: "Business name too long" });
  }
  try {
    const next = { ...readAppConfig(), businessName };
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(next, null, 2), "utf8");
    res.json(next);
  } catch {
    res.status(500).json({ error: "Failed to update business name" });
  }
});

// Apply rate limit only to ticket creation
app.use("/api/tickets/create", ticketLimiter);

// Admin broadcast message endpoint
app.post("/api/broadcast", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });
  io.emit("broadcastMessage", { message, time: new Date().toLocaleTimeString() });
  res.json({ success: true });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
