import { forwardRef } from "react";
import { detectDeviceLanguage, translate } from "../game/i18n";

type MinimapPanelProps = {
  title: string;
  coordinates?: string;
  collapsed: boolean;
  onToggle: () => void;
  onSearch?: () => void;
  searchTitle?: string;
};

export const MinimapPanel = forwardRef<HTMLCanvasElement, MinimapPanelProps>(
  function MinimapPanel(
    {
      title,
      coordinates = "X: 10650 Y: 6254",
      collapsed,
      onToggle,
      onSearch,
      searchTitle = "Tìm tọa độ",
    },
    canvasRef,
  ) {
    const language = detectDeviceLanguage();
    const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
    return (
      <div
        className={`hud-minimap-card premium-framed ${collapsed ? "collapsed" : ""}`}
        data-minimap-state={collapsed ? "collapsed" : "expanded"}
      >
        <div className="hud-minimap-header">
          <span className="hud-minimap-title">
            <span className="hud-minimap-svg-icon">
              <img src="/assets/icons/icon_map.png" alt="" />
            </span>
            <span className="hud-minimap-title-copy">
              <strong>{title}</strong>
              <small>{t("kingdomMap")}</small>
            </span>
          </span>
          <span className="hud-minimap-live">{t("online")}</span>
          <button
            type="button"
            className="hud-mini-icon-btn-plus"
            title={collapsed ? t("expandMap") : t("collapseMap")}
            aria-label={collapsed ? t("expandMap") : t("collapseMap")}
            aria-expanded={!collapsed}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            <img
              className={collapsed ? "is-collapsed" : ""}
              src="/assets/icons/icon_collapse_european.png"
              alt=""
            />
          </button>
        </div>

        <div className="minimap-panel-body">
          <div className="hud-minimap-coords-display">
            <span className="coords-text">{coordinates}</span>
            {onSearch && (
              <button
                type="button"
                className="hud-mini-icon-btn"
                onClick={onSearch}
                title={searchTitle}
                aria-label={searchTitle}
              >
                <img src="/assets/icons/icon_search_european.png" alt="" />
              </button>
            )}
          </div>

          <div className="hud-minimap-canvas-wrapper">
            <canvas
              ref={canvasRef}
              width={160}
              height={120}
              className="hud-minimap-canvas"
              aria-label={t("minimap")}
            />
          </div>

          <div className="minimap-marker-legend" aria-label={t("mapLegend")}>
            <span>
              <i className="minimap-marker-dot player" /> {t("you")}
            </span>
            <span>
              <i className="minimap-marker-dot other" /> {t("otherPlayers")}
            </span>
          </div>
        </div>

      </div>
    );
  },
);
