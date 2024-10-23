const axios = require('axios');
const WebSocket = require('ws');
require('dotenv').config();

const API_URI = process.env.VITE_BASE_URL;

if (!API_URI) {
  console.error('API_URI is not defined in environment variables.');
  process.exit(1); // Dừng chương trình nếu không có API_URI
}

function setupWebSocketServer(server) {
  const io = require('socket.io')(server, {
    cors: { origin: "*" }
  });

  io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('message', async (message) => {
      io.emit('message', message);
      try {
        // Gửi yêu cầu đến server chứa Order
        const response = await axios.get(`${API_URI}/orders`); // Đảm bảo API_URI hợp lệ
        const dbData = response.data; // Giả sử dữ liệu trả về là mảng các đơn hàng
        
        io.emit('adminEvent', dbData);
      } catch (error) {
        console.error('Error fetching data from order server:', error.message || error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
}

module.exports = setupWebSocketServer;
