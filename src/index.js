const express = require('express');
const http = require('http');
const setupNotifySocketServer = require('./websocket/setupNotifySocketServer'); // Thay đổi đường dẫn nếu cần

const db = require("./config/db");

db.connect()

const app = express();
const server = http.createServer(app);

// Cấu hình WebSocket
setupNotifySocketServer(server);

// Định nghĩa một route đơn giản
app.get('/', (req, res) => {
  res.send('Welcome to the WebSocket server!');
});

// Chạy server trên cổng 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
