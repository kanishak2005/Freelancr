import { RouterProvider } from "react-router-dom";

import SocketProvider from "./components/common/SocketProvider";
import AuthInitializer from "./components/common/AuthInitializer";

import  {router}  from "./routes";

function App() {
  return (
    <>
      <AuthInitializer />

      <SocketProvider />

      <RouterProvider router={router} />
    </>
  );
}

export default App;