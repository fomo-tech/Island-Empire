import {
  forwardRef,
  type ReactNode,
} from "react";

type MinimapPanelProps = {
  title: string;
  coordinates?: string;
  collapsed: boolean;
  onToggle: () => void;
  onSearch?: () => void;
  searchTitle?: string;
  children?: ReactNode;
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
      children,
    },
    canvasRef,
  ) {
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
            {title}
          </span>
          <button
            type="button"
            className="hud-mini-icon-btn-plus"
            title={collapsed ? "Mở rộng bản đồ" : "Thu gọn bản đồ"}
            aria-label={collapsed ? "Mở rộng bản đồ" : "Thu gọn bản đồ"}
            aria-expanded={!collapsed}
            onClick={onToggle}
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
              aria-label="Bản đồ thu nhỏ"
            />
          </div>

          <div className="minimap-marker-legend" aria-label="Chú thích bản đồ">
            <span>
              <i className="minimap-marker-dot player" /> Bạn
            </span>
            <span>
              <i className="minimap-marker-dot other" /> Người chơi khác
            </span>
          </div>

          {children}
        </div>
      </div>
    );
  },
);
