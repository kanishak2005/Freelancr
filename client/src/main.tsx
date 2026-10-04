import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import Providers from "./app/providers";
import App from "./App";
import { store } from "./store";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <Providers>
        <App />
      </Providers>
    </Provider>
  </React.StrictMode>
);