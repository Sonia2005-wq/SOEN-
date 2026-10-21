import { io } from "socket.io-client";

let socketInstance = null;

// 1. Initialize socket connection
export const initializeSocket = (projectId) => {
  // Reuse the existing connection for the same project
  if (
    socketInstance &&
    socketInstance.connected &&
    socketInstance.io.opts.query?.projectId === projectId
  ) {
    return socketInstance;
  }

  // Close the previous connection if it exists
  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io(import.meta.env.VITE_API_URL, {
    auth: {
      token: localStorage.getItem("token"),
    },
    query: {
      projectId,
    },
  });

  socketInstance.on("connect", () => {
    console.log("Socket connected:", socketInstance.id);
  });

  socketInstance.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
  });

  return socketInstance;
};

// 2. Receive messages
export const receiveMessage = (eventName, cb) => {
  if (!socketInstance) {
    console.error("Socket is not initialized!");
    return;
  }

  socketInstance.on(eventName, cb);
};

// 3. Send messages
// 3. Send messages
export const sendMessage = (eventName, data) => {
  console.log("Attempting to send message:", {
    eventName,
    data,
    connected: socketInstance?.connected,
  });

  if (!socketInstance || !socketInstance.connected) {
    console.error("Socket is not connected!");
    return;
  }

  socketInstance.emit(eventName, data);

  console.log("Message emitted successfully!");
};

// 4. Disconnect socket
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};