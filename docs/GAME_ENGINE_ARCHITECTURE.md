# Game Engine Architecture

Tai lieu nay mo ta kien truc hien tai cua game engine canvas trong [apps/game/src/game/engine.ts](../apps/game/src/game/engine.ts) sau cac dot refactor theo huong module hoa.

## 1) Muc tieu kien truc

- Giu [apps/game/src/game/engine.ts](../apps/game/src/game/engine.ts) lam orchestration layer.
- Day logic theo nhom trach nhiem sang cac helper module.
- Giam rui ro regression bang cach tach theo slice nho va giu API on dinh.
- Dam bao `GameEngineHandle` giu nguyen contract voi UI layer.

## 2) Public contract

Public API duoc dinh nghia o [apps/game/src/game/engineCore.ts](../apps/game/src/game/engineCore.ts) qua type `GameEngineHandle`.

Cac nhom API chinh:

- Lifecycle: `destroy`
- State access: `getState`, `getTowns`, `getRegions`, `getIslets`
- Projection va query: `mapToScreen`, `getRegionOwnership`, `getRegionCenter`, `getActiveBattleForRegion`
- Expansion va route: `canBuildStronghold`, `getExpansionConnectionType`, `getExpansionSourceRegionsForTarget`, `getMarchRouteStatus`
- Action gateway: `handleAction`
- Newbie flow: `startNewbieOnboarding`, `cancelNewbieOnboarding`, `selectNewbieLand`
- Debug/visibility: `setHideTerritoryAssets`, `isHidingTerritoryAssets`, `toggleHideTerritoryAssets`

## 3) Module map

### 3.1 Core orchestration

- [apps/game/src/game/engine.ts](../apps/game/src/game/engine.ts)
  - Khoi tao world/runtime state
  - Wire dependencies giua helper modules
  - Quan ly `loop(now)` render/sim scheduling
  - Return `GameEngineHandle`

### 3.2 Action pipeline

- [apps/game/src/game/engineActionDispatcher.ts](../apps/game/src/game/engineActionDispatcher.ts)
  - Router trung tam cho `handleAction`
  - Thu tu xu ly:
    1. prelude actions
    2. apply game state
    3. backend bridge actions
    4. followup actions
    5. fallback `handleButton`

- [apps/game/src/game/engineActionPrelude.ts](../apps/game/src/game/engineActionPrelude.ts)
  - Cac action setup/trang thai dau vao
  - Vi du: minimap canvas, overlay, render suspend, config, local player, shop skin

- [apps/game/src/game/engineApplyGameStateAction.ts](../apps/game/src/game/engineApplyGameStateAction.ts)
  - Hydrate game state tong hop tu backend payload
  - Sync ownership, profile, towns, marches, battles, clearings

- [apps/game/src/game/engineBackendActionBridge.ts](../apps/game/src/game/engineBackendActionBridge.ts)
  - Action sync don le tu backend
  - Vi du: apply ownership update, apply/remove march, apply/remove battle, focus actions

- [apps/game/src/game/engineActionFollowup.ts](../apps/game/src/game/engineActionFollowup.ts)
  - Action follow-up va UX messaging
  - Vi du: claim reject, cancel claim, center camera, starter region, server-confirmed toast actions

### 3.3 Runtime simulation va loop

- [apps/game/src/game/engineSimulation.ts](../apps/game/src/game/engineSimulation.ts)
  - `sim(dt)` cho progression logic
  - `hasActiveAnimations()` cho dynamic FPS gate
  - Tick voyages, battles, clearing timing, camera inertia, ambient faction logs

- [apps/game/src/game/engineLifecycle.ts](../apps/game/src/game/engineLifecycle.ts)
  - `destroy()` cleanup listeners/cache/raf

### 3.4 Query va API facade

- [apps/game/src/game/enginePublicQueries.ts](../apps/game/src/game/enginePublicQueries.ts)
  - Query nghiep vu: ownership, expansion, town/region lookup, route status, active battle

- [apps/game/src/game/enginePublicApiUtility.ts](../apps/game/src/game/enginePublicApiUtility.ts)
  - Wrapper API utility: get list data, map projection passthrough, asset visibility toggles, config getter

- [apps/game/src/game/engineChatActions.ts](../apps/game/src/game/engineChatActions.ts)
  - `sendChat` va auto-reply tu NPC factions

- [apps/game/src/game/engineNewbieActions.ts](../apps/game/src/game/engineNewbieActions.ts)
  - Public actions cho newbie onboarding

### 3.5 Domain helper modules khac

- [apps/game/src/game/engineTownEconomy.ts](../apps/game/src/game/engineTownEconomy.ts)
- [apps/game/src/game/engineBackendSync.ts](../apps/game/src/game/engineBackendSync.ts)
- [apps/game/src/game/engineCanvasGestureInput.ts](../apps/game/src/game/engineCanvasGestureInput.ts)
- [apps/game/src/game/engineCanvasClickAction.ts](../apps/game/src/game/engineCanvasClickAction.ts)
- [apps/game/src/game/enginePointer.ts](../apps/game/src/game/enginePointer.ts)
- [apps/game/src/game/engineMinimapInteraction.ts](../apps/game/src/game/engineMinimapInteraction.ts)
- [apps/game/src/game/engineKeyboardShortcuts.ts](../apps/game/src/game/engineKeyboardShortcuts.ts)
- [apps/game/src/game/engineCameraPersistence.ts](../apps/game/src/game/engineCameraPersistence.ts)
- [apps/game/src/game/engineSpriteAtlases.ts](../apps/game/src/game/engineSpriteAtlases.ts)
- [apps/game/src/game/engineVegetation.ts](../apps/game/src/game/engineVegetation.ts)
- [apps/game/src/game/engineWorldPrep.ts](../apps/game/src/game/engineWorldPrep.ts)

## 4) Luong xu ly action

`handleAction(id, payload)` duoc xu ly theo pipeline sau:

1. Prelude
- Action setup state/UI co tan suat cao va side-effect nho.

2. Full state hydration
- Action `applyGameState` cap nhat trang thai tong hop theo snapshot backend.

3. Backend bridge
- Action delta/event tu backend cho battle/march/ownership.

4. Followup
- Action UX, reject handling, center camera, stub server-confirm actions.

5. Fallback
- Neu khong khop nhom nao, route qua `handleButton(id)`.

Luu y:

- Dispatcher hien tai la single entrypoint, de quan sat va test.
- Thu tu pipeline quan trong, khong doi thu tu neu chua co test coverage tuong ung.

## 5) Luong simulation va render

Trong [apps/game/src/game/engine.ts](../apps/game/src/game/engine.ts):

- `loop(now)` quan ly frame pacing
- `sim(dt)` duoc goi tu helper simulation
- `drawFrame()` phan render
- `onUpdate(state, towns)` la bridge ra React overlay

Chi tiet pacing:

- Hidden tab: bo qua sim/render nang, giu `requestAnimationFrame`
- Render suspended: lower fps boot frame
- Normal mode: dynamic fps theo animation load
  - Crowded: giam fps
  - Idle overlay: giam fps

## 6) Refactor conventions

Ap dung trong toan bo folder [apps/game/src/game](../apps/game/src/game):

- Moi helper xuat 1 factory `createXxxHelper(s)`
- Dependency injection qua object `deps`
- Tranh import vong giua helper modules
- Uu tien pure-ish helpers; side effects gom tai orchestration
- Giu ten bien va luong du lieu nhat quan voi code cu de tranh regressions

## 7) Safety checklist khi tiep tuc tach module

1. Trinh tu thong thuong
- Chon 1 khoi logic lon
- Tao helper moi, copy logic sang helper
- Wire helper trong engine
- Xoa block inline cu

2. Validation bat buoc
- Chay `npm --prefix apps/game run typecheck`
- Quet diagnostics file vua sua
- Smoke test local:
  - vao game
  - di chuyen camera
  - click action co server feedback
  - action backend sync co cap nhat dung

3. Cac diem de vo nhat
- Thu tu khoi tao helper co dependency callback
- Symbol ton tai duoi `@ts-nocheck` co the fail runtime du typecheck xanh
- Cleanup listeners trong `destroy`

## 8) Huong dan them action moi

Vi du them action `myNewAction`:

1. Xac dinh layer
- Prelude: setup state/UI nhanh
- ApplyGameState: hydration snapshot
- BackendBridge: event tu backend
- Followup: UX/reject/no-op server confirm

2. Them logic vao helper phu hop
- Tra ve `handled` hoac `handledWith(result)` theo pattern hien co

3. Neu action can o layer khac
- Can nhac tao helper moi thay vi phinh helper cu

4. Validate
- Typecheck + smoke
- Kiem tra return behavior cua `handleAction`

## 9) Huong dan them query/public API moi

1. Query nghiep vu
- Them vao [apps/game/src/game/enginePublicQueries.ts](../apps/game/src/game/enginePublicQueries.ts)

2. Utility wrapper
- Them vao [apps/game/src/game/enginePublicApiUtility.ts](../apps/game/src/game/enginePublicApiUtility.ts)

3. Onboarding/chat/lifecycle
- Theo module chuyen trach tuong ung

4. Cuoi cung
- Wire lai trong [apps/game/src/game/engine.ts](../apps/game/src/game/engine.ts)
- Dam bao khop type `GameEngineHandle`

## 10) Ghi chu van hanh

- Co [apps/game/src/game/engine.ts](../apps/game/src/game/engine.ts) va nhieu helper dang `@ts-nocheck`.
- Vi vay, compile xanh chua du de ket luan runtime safe.
- Luon uu tien smoke test cac luong critical sau moi dot refactor.

## 11) Tai lieu lien quan

- [README.md](../README.md)
- [docs/REFACTOR_SAFE_ROLLOUT.md](REFACTOR_SAFE_ROLLOUT.md)
- [docs/REALTIME_PERFORMANCE.md](REALTIME_PERFORMANCE.md)
