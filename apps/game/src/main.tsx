import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "./components/GameApp";
import { ConquestMap } from "./components/ConquestMap";
import { updateActiveMap } from "./game/api";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

function AppRouter() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("island_empire_token");
    if (token) updateActiveMap(token, path === "/conquest" ? "conquest" : "world").catch(() => undefined);
  }, [path]);

  const navigate = (nextPath: "/" | "/conquest" | "/conquest-test") => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
      setPath(nextPath);
    }
  };

  const isConquest = path === "/conquest" || path === "/conquest-test";

  return (
    <GameApp
      conquestMode={isConquest}
      onOpenConquest={() => navigate("/conquest-test")}
      onOpenWorld={() => navigate("/")}
    />
  );
}

createRoot(root).render(<StrictMode><AppRouter /></StrictMode>);
