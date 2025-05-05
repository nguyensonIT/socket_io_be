require("dotenv").config();

// Mô hình trạng thái trong MongoDB
const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema({
  isOpen: { type: Boolean, required: true },
  isManualOverride: { type: Boolean, required: true },
  updatedAt: { type: Date, default: Date.now },
});

const Status = mongoose.model("Status", statusSchema);

async function loadInitialStatus() {
  const status = await Status.findOne();
  if (status) {
    return { isOpen: status.isOpen, isManualOverride: status.isManualOverride };
  } else {
    // Nếu chưa có dữ liệu, khởi tạo trạng thái tự động theo giờ
    const initialStatus = isWithinBusinessHours();
    await Status.create({ isOpen: initialStatus, isManualOverride: false });
    return { isOpen: initialStatus, isManualOverride: false };
  }
}

async function saveStatus(isOpen, isManualOverride) {
  await Status.findOneAndUpdate(
    {},
    { isOpen, isManualOverride, updatedAt: new Date() },
    { upsert: true }
  );
}

// Server WebSocket với trạng thái được lưu
async function setupWebSocketServer(server) {
  const io = require("socket.io")(server, {
    cors: { origin: "*" },
    path: "/socket.io/",
  });

  // Tải trạng thái ban đầu từ database
  const { isOpen: initialIsOpen, isManualOverride: initialManualOverride } =
    await loadInitialStatus();
  let isOpen = initialIsOpen;
  let isManualOverride = initialManualOverride;

  async function emitStatus() {
    io.emit("statusOpenDoor", isOpen);
    await saveStatus(isOpen, isManualOverride); // Lưu vào database
  }

  setInterval(async () => {
    const currentStatus = isWithinBusinessHours();

    if (!isManualOverride && currentStatus !== isOpen) {
      isOpen = currentStatus;
      await emitStatus();
    }

    if (isManualOverride && currentStatus === isOpen) {
      isManualOverride = false;
      await emitStatus();
    }
  }, 60000);

  io.on("connection", (socket) => {
    console.log("Client connected");
    socket.emit("statusOpenDoor", isOpen);

    socket.on("toggleOpenDoorStatus", async () => {
      isOpen = !isOpen;
      isManualOverride = true;
      await emitStatus();
    });
    socket.on("message", async (message) => {
      io.emit("message", message);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  return io;
}

function isWithinBusinessHours() {
  const now = new Date();
  const localNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
  );
  const hour = localNow.getHours();
  const minute = localNow.getMinutes();
  console.log(hour, minute);
  return (
    (hour > 9 || (hour === 9 && minute >= 0)) &&
    (hour < 22 || (hour === 22 && minute < 1))
  );
}

module.exports = setupWebSocketServer;
