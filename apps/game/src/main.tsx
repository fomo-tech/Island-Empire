import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "./components/GameApp";
import { ConquestMap } from "./components/ConquestMap";
import { updateActiveMap } from "./game/api";
import "./styles/global.css";
import "./styles/founding.css";
import "./styles/minimap.css";
import "./styles/chat.css";
import "./styles/hud-topbar.css";
import "./styles/chat-reference.css";
import "./styles/shop-trial.css";
import "./styles/shop.css";
import "./styles/settings.css";
import "./styles/war-reports.css";
import "./styles/battle-report.css";
import "./styles/typography.css";
import "./styles/hud-mobile.css";
import "./styles/tooltip-redesign.css";
import "./styles/town-management.css";
import "./styles/ranking.css";
import "./styles/attack-dispatch.css";
import "./styles/battle-report-redesign.css";
import "./styles/shop-compact.css";
import "./styles/ranking-redesign.css";
import "./styles/ranking-v4.css";
import "./styles/resource-hud-v2.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

function AppRouter() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const rootElement = document.documentElement;
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const updateViewport = () => {
      const viewport = window.visualViewport;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const keyboardOffset = Math.max(
        0,
        window.innerHeight - viewportHeight - (viewport?.offsetTop ?? 0),
      );
      rootElement.style.setProperty("--app-height", `${viewportHeight}px`);
      rootElement.style.setProperty("--keyboard-offset", `${keyboardOffset}px`);
      rootElement.dataset.keyboardOpen =
        keyboardOffset > 120 ? "true" : "false";
      rootElement.dataset.touch = coarsePointer.matches ? "true" : "false";
    };
    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });
    window.addEventListener("orientationchange", updateViewport, {
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", updateViewport, {
      passive: true,
    });
    window.visualViewport?.addEventListener("scroll", updateViewport, {
      passive: true,
    });
    coarsePointer.addEventListener("change", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      coarsePointer.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("island_empire_token");
    if (token)
      updateActiveMap(token, path === "/conquest" ? "conquest" : "world").catch(
        () => undefined,
      );
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

createRoot(root).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
