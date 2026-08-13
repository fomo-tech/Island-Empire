import type { RefObject } from "react";
import { MinimapPanel } from "../MinimapPanel";

export type BattlefieldActivityItem = {
  id: string;
  title: string;
  meta: string;
  icon: string;
  tone: "danger" | "warning" | "active" | "building" | "calm";
  priority: number;
  territoryId?: number;
  marchId?: string;
  focus?: "territory" | "march";
};

type TacticalHudProps = {
  minimapRef: RefObject<HTMLCanvasElement | null>;
  minimapTitle: string;
  minimapCollapsed: boolean;
  onToggleMinimap: () => void;
  onSearchCoordinates: () => void;
  searchTitle: string;
  battlefieldTitle: string;
  battlefieldShortTitle: string;
  battlefieldCollapsed: boolean;
  onToggleBattlefield: () => void;
  activities: BattlefieldActivityItem[];
  activityCount: number;
  onFocusActivity: (activity: BattlefieldActivityItem) => void;
};

export function TacticalHud({
  minimapRef,
  minimapTitle,
  minimapCollapsed,
  onToggleMinimap,
  onSearchCoordinates,
  searchTitle,
  battlefieldTitle,
  battlefieldShortTitle,
  battlefieldCollapsed,
  onToggleBattlefield,
  activities,
  activityCount,
  onFocusActivity,
}: TacticalHudProps) {
  return (
    <aside
      id="tactical-hud"
      className={`tactical-hud-rail hud-right-side hud-interactive ${
        minimapCollapsed ? "" : "mobile-minimap-open"
      }`}
      data-minimap={minimapCollapsed ? "collapsed" : "expanded"}
      data-battlefield={battlefieldCollapsed ? "collapsed" : "expanded"}
      aria-label={`${minimapTitle} · ${battlefieldTitle}`}
    >
      <MinimapPanel
        ref={minimapRef}
        title={minimapTitle}
        collapsed={minimapCollapsed}
        onToggle={onToggleMinimap}
        onSearch={onSearchCoordinates}
        searchTitle={searchTitle}
      />

      <section
        className={`tactical-battlefield hud-main-missions ${
          battlefieldCollapsed ? "is-collapsed" : ""
        }`}
        aria-label={battlefieldTitle}
        data-compact-label={battlefieldShortTitle}
      >
        <button
          type="button"
          className="hud-main-missions-header"
          onClick={onToggleBattlefield}
          aria-expanded={!battlefieldCollapsed}
          aria-controls="battlefield-situation-list"
        >
          <span className="hud-main-missions-header-title">
            <span className="tactical-menu-icon" aria-hidden="true">
              <img src="/assets/icons/menu/battlefield.png" alt="" />
            </span>
            <span className="hud-battlefield-full-label">{battlefieldTitle}</span>
            <span className="hud-battlefield-compact-label">
              {battlefieldShortTitle}
            </span>
            {activityCount > 0 && <em>{activityCount}</em>}
          </span>
          <span className="hud-main-missions-toggle" aria-hidden="true">
            <img src="/assets/icons/icon_collapse_european.png" alt="" />
          </span>
        </button>

        <div
          className="hud-main-missions-list"
          id="battlefield-situation-list"
          aria-hidden={battlefieldCollapsed}
        >
          {activities.map((activity) => (
              <button
                type="button"
                className={`hud-main-mission battlefield-${activity.tone}`}
                key={activity.id}
                disabled={!activity.focus}
                onClick={() => onFocusActivity(activity)}
                title={
                  activity.focus
                    ? `Định vị ${activity.title.toLowerCase()}`
                    : activity.meta
                }
              >
                <span className="hud-main-mission-icon">
                  <img src={activity.icon} alt="" />
                </span>
                <span className="hud-main-mission-copy">
                  <b>{activity.title}</b>
                  <span className="hud-main-mission-meta">{activity.meta}</span>
                </span>
                {activity.focus && (
                  <span className="hud-main-mission-locate" aria-hidden="true">
                    <img src="/assets/icons/icon_search_european.png" alt="" />
                  </span>
                )}
              </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
