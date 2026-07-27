import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "./components/GameApp";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

createRoot(root).render(
  <StrictMode>
    <GameApp />
  </StrictMode>,
);
