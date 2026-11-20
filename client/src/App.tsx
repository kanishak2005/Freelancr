import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import SocketProvider from "./components/common/SocketProvider";
import AuthInitializer from "./components/common/AuthInitializer";

import { router } from "./routes";

function App() {
  return (
    <>
      <AuthInitializer />

      <SocketProvider />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1e293b",
            color: "#f8fafc",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
          },
          success: {
            iconTheme: { primary: "#10b981", secondary: "#ffffff" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
          },
        }}
      />

      <RouterProvider router={router} />
    </>
  );
}

export default App;