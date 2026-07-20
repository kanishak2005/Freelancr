import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";

import Providers from "./app/providers";
import { router } from "./routes";
import { store } from "./store";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </Provider>
  </React.StrictMode>
);