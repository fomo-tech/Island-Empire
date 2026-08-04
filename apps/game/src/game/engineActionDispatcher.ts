// @ts-nocheck

export function createEngineActionDispatcher(deps: {
  handlePreludeAction: (id: string, payload?: any) => boolean;
  handleApplyGameStateAction: (id: string, payload?: any) => boolean;
  handleBackendBridgeAction: (
    id: string,
    payload?: any,
  ) => {
    handled: boolean;
    hasResult: boolean;
    result?: any;
  };
  handleFollowupAction: (
    id: string,
    payload?: any,
  ) => {
    handled: boolean;
    hasResult: boolean;
    result?: any;
  };
  handleButton: (id: string) => any;
}) {
  const {
    handlePreludeAction,
    handleApplyGameStateAction,
    handleBackendBridgeAction,
    handleFollowupAction,
    handleButton,
  } = deps;

  function handleAction(id: string, payload?: any) {
    if (handlePreludeAction(id, payload)) return;
    if (handleApplyGameStateAction(id, payload)) return;

    const backendBridgeResult = handleBackendBridgeAction(id, payload);
    if (backendBridgeResult.handled) {
      if (backendBridgeResult.hasResult) {
        return backendBridgeResult.result;
      }
      return;
    }

    const followupActionResult = handleFollowupAction(id, payload);
    if (followupActionResult.handled) {
      if (followupActionResult.hasResult) {
        return followupActionResult.result;
      }
      return;
    }

    return handleButton(id);
  }

  return {
    handleAction,
  };
}
