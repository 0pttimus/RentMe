import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import { RouterProvider } from "react-router-dom";
import { initializeTheme, ThemeProvider } from "@/lib/theme/ThemeProvider";
import { router } from "./router";
import { store } from "./store";
import "./styles/global.scss";

initializeTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  </StrictMode>
);
