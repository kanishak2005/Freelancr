import { useEffect } from "react";
import { socket } from "../../lib/socket";

export default function SocketProvider() {
  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      return;
    }

    socket.auth = {
      token,
    };

    const handleConnect = () => {
      console.log("✅ Socket connected:", socket.id);
    };

    const handleConnectError = (error: Error) => {
      console.error(
        "❌ Socket connection error:",
        error.message
      );
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.disconnect();
    };
  }, []);

  return null;
}