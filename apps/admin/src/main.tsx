import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "./components/AdminApp";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

createRoot(root).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
