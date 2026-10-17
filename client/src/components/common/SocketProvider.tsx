import { useEffect } from "react";
import { socket, connectSocket, disconnectSocket, SOCKET_EVENTS } from "../../lib/socket";
import { setAuthErrorCallback } from "../../lib/axios";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearCredentials } from "../../store/slices/authSlice";

export default function SocketProvider() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(
    (state) => state.auth.isAuthenticated
  );
  const user = useAppSelector((state) => state.auth.user);

  // Synchronize 401 unrecoverable auth failures with Redux
  useEffect(() => {
    setAuthErrorCallback(() => {
      disconnectSocket();
      dispatch(clearCredentials());
    });

    return () => {
      setAuthErrorCallback(null);
    };
  }, [dispatch]);

  // Manage socket connection lifecycle driven by Redux auth state
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      disconnectSocket();
      return;
    }

    const handleConnect = () => {
      console.log("✅ Socket connected:", socket.id);
    };

    const handleDisconnect = (reason: string) => {
      console.log("ℹ️ Socket disconnected:", reason);
    };

    const handleConnectError = (error: Error) => {
      console.error("❌ Socket connection error:", error.message);
    };

    socket.on(SOCKET_EVENTS.CONNECT, handleConnect);
    socket.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
    socket.on(SOCKET_EVENTS.CONNECT_ERROR, handleConnectError);

    connectSocket(token);

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, handleConnect);
      socket.off(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
      socket.off(SOCKET_EVENTS.CONNECT_ERROR, handleConnectError);
    };
  }, [isAuthenticated, user?.id]);

  return null;
}