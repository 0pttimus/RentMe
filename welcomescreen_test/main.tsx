import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./reset.css";
import WelcomeScreen from "./WelcomeScreen";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element");

createRoot(root).render(
  <StrictMode>
    <WelcomeScreen onCreateAccount={() => alert("Create Account")} onSignIn={() => alert("Sign In")} />
  </StrictMode>
);
