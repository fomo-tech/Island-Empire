import { useEffect, useState } from "react";
import { ConfirmModal } from "./ConfirmModal";
import { MedievalModal } from "./MedievalModal";
import {
  GAME_LANGUAGES,
  translate,
  type GameLanguage,
} from "../game/i18n";

type SettingsTab = "display" | "account" | "controls";

interface SettingsModalProps {
  language: GameLanguage;
  onSetLanguage: (language: GameLanguage) => void;
  onLogout?: () => void;
  onClose: () => void;
  playerId?: string | null;
  online: boolean;
}

const TUTORIAL_STORAGE_KEYS = [
  "island_empire_onboarding_pending",
  "island_empire_tutorial_completed",
  "island_empire_hide_tutorial",
  "island_empire_onboarding_claim",
  "island_empire_camera_v1",
  "island_empire_builder_region_id",
];

function SettingsSwitch({
  active,
  label,
  onChange,
}: {
  active: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className={`settings-switch ${active ? "active" : ""}`}
      onClick={onChange}
      aria-label={label}
      aria-pressed={active}
    >
      <span className="settings-switch-thumb" />
    </button>
  );
}

export function SettingsModal({
  language,
  onSetLanguage,
  onLogout,
  onClose,
  playerId,
  online,
}: SettingsModalProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [activeTab, setActiveTab] = useState<SettingsTab>("display");
  const [confirmAction, setConfirmAction] = useState<"logout" | "resetTutorial" | null>(null);
  const [hideAssets, setHideAssets] = useState(
    () => localStorage.getItem("island_empire_hide_assets") === "true",
  );
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const toggleAssets = () => {
    const next = !hideAssets;
    const toggle = (window as Window & {
      toggleHideTerritoryAssets?: (forceValue?: boolean) => boolean;
    }).toggleHideTerritoryAssets;
    if (!toggle) return;
    toggle(next);
    setHideAssets(next);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };

  const copyPlayerId = async () => {
    if (!playerId) return;
    await navigator.clipboard.writeText(playerId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <>
      <MedievalModal
        title={t("systemSettings")}
        subtitle={t("activeFeaturesOnly")}
        onClose={onClose}
        width="94vw"
        maxWidth="900px"
        className="settings-medieval-modal settings-v3"
      >
        <div className="settings-v3__shell">
          <aside className="settings-v3__sidebar">
            <div className={`settings-v3__server ${online ? "is-online" : "is-offline"}`}>
              <i />
              <span>{online ? t("connected") : t("reconnecting")}</span>
            </div>
            <nav className="settings-v3__nav" aria-label={t("systemSettings")}>
            <button type="button" className={activeTab === "display" ? "active" : ""} onClick={() => setActiveTab("display")}>
              <span className="settings-v3__nav-icon"><img src="/assets/icons/icon_settings_display.png" alt="" /></span>
              <span><strong>{t("displayTab")}</strong><small>{t("mapDisplay")}</small></span>
            </button>
            <button type="button" className={activeTab === "account" ? "active" : ""} onClick={() => setActiveTab("account")}>
              <span className="settings-v3__nav-icon"><img src="/assets/icons/icon_settings_account.png" alt="" /></span>
              <span><strong>{t("accountTab")}</strong><small>{t("accountConnection")}</small></span>
            </button>
            <button type="button" className={activeTab === "controls" ? "active" : ""} onClick={() => setActiveTab("controls")}>
              <span className="settings-v3__nav-icon"><img src="/assets/icons/icon_settings_info.png" alt="" /></span>
              <span><strong>{t("controlsTab")}</strong><small>{t("supportedControls")}</small></span>
            </button>
            </nav>
            <div className="settings-v3__sidebar-foot">HEX RIVALS <b>v1.0</b></div>
          </aside>

          <main className="settings-v3__main">
            {activeTab === "display" && (
              <section className="settings-v3__section">
                <header className="settings-v3__section-head"><span>01</span><div><h3>{t("mapDisplay")}</h3><p>{t("changesImmediate")}</p></div></header>
                <div className="settings-v3__group">
                  <div className="settings-v3__group-title"><strong>{t("interfaceLanguage")}</strong><small>{t("fiveLanguages")}</small></div>
                  <div className="settings-v3__languages">
                    {GAME_LANGUAGES.map((option) => (
                      <button key={option.code} lang={option.code} type="button" className={language === option.code ? "active" : ""} onClick={() => onSetLanguage(option.code)}>
                        <span>{option.shortLabel}</span><strong>{option.label}</strong><i aria-hidden="true">✓</i>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-v3__option-grid">
                  <article className="settings-v3__option">
                    <img src="/assets/icons/icon_settings_display.png" alt="" />
                    <span><strong>{t("hideMapAssets")}</strong><small>{t("hideMapAssetsHint")}</small></span>
                    <SettingsSwitch active={hideAssets} label={t("hideMapAssets")} onChange={toggleAssets} />
                  </article>
                  <article className="settings-v3__option">
                    <img src="/assets/icons/icon_settings_display.png" alt="" />
                    <span><strong>{t("fullscreen")}</strong><small>{t("fullscreenHint")}</small></span>
                    <SettingsSwitch active={fullscreen} label={t("fullscreen")} onChange={() => void toggleFullscreen()} />
                  </article>
                </div>
              </section>
            )}

            {activeTab === "account" && (
              <section className="settings-v3__section">
                <header className="settings-v3__section-head"><span>02</span><div><h3>{t("accountConnection")}</h3><p>{t("currentSessionInfo")}</p></div></header>
                <div className="settings-v3__identity">
                  <div className="settings-v3__identity-icon"><img src="/assets/icons/icon_settings_account.png" alt="" /></div>
                  <span><small>{t("playerId")}</small><strong>{playerId || t("unknown")}</strong></span>
                  <button type="button" disabled={!playerId} onClick={() => void copyPlayerId()}>{copied ? t("copied") : t("copy")}</button>
                </div>
                <div className="settings-v3__connection">
                  <span><i className={online ? "is-online" : "is-offline"} />{t("realtimeConnection")}</span>
                  <strong>{online ? t("connected") : t("reconnecting")}</strong>
                </div>
                <div className="settings-v3__account-actions">
                  <article><span><strong>{t("resetTutorial")}</strong><small>{t("resetTutorialHint")}</small></span><button type="button" onClick={() => setConfirmAction("resetTutorial")}>{t("reset")}</button></article>
                  {onLogout && <article className="is-danger"><span><strong>{t("logout")}</strong><small>{t("logoutHint")}</small></span><button type="button" onClick={() => setConfirmAction("logout")}>{t("logout")}</button></article>}
                </div>
              </section>
            )}

            {activeTab === "controls" && (
              <section className="settings-v3__section">
                <header className="settings-v3__section-head"><span>03</span><div><h3>{t("supportedControls")}</h3><p>{t("controlsVerified")}</p></div></header>
                <div className="settings-v3__hotkeys">
                  <div><kbd>{t("leftMouse")}</kbd><span>{t("selectTarget")}</span></div>
                  <div><kbd>{t("dragMap")}</kbd><span>{t("moveCamera")}</span></div>
                  <div><kbd>{t("mouseWheel")}</kbd><span>{t("zoomMap")}</span></div>
                  <div><kbd>Esc</kbd><span>{t("clearSelection")}</span></div>
                  <div><kbd>F</kbd><span>{t("toggleFullscreen")}</span></div>
                  <div><kbd>H</kbd><span>{t("toggleAssets")}</span></div>
                  <div><kbd>0</kbd><span>{t("centerWorld")}</span></div>
                </div>
              </section>
            )}
          </main>

          <footer className="settings-v3__footer">
            <span><i>✓</i>{t("allChangesImmediate")}</span>
            <button type="button" onClick={onClose}>{t("close")}</button>
          </footer>
        </div>
      </MedievalModal>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction === "logout" ? t("logout").toUpperCase() : t("resetTutorial").toUpperCase()}
          message={confirmAction === "logout" ? t("logoutQuestion") : t("resetTutorialQuestion")}
          confirmLabel={confirmAction === "logout" ? t("logout").toUpperCase() : t("reset").toUpperCase()}
          icon={confirmAction === "logout" ? "settingsAccount" : "settingsInfo"}
          tone="danger"
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === "logout") {
              setConfirmAction(null);
              onClose();
              onLogout?.();
              return;
            }
            TUTORIAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
