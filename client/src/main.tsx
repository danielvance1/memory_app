import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./auth";
import { CodesProvider } from "./codes";
import { ToastProvider } from "./toast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CodesProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </CodesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
