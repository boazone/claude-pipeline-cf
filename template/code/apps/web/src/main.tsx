import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { reportUncaughtErrors } from "./system-log";

reportUncaughtErrors();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App path={location.pathname} />
  </StrictMode>,
);
