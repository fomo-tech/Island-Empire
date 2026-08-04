// @ts-nocheck

export function createNewbieActionsHelper(deps: {
  state: any;
  newbieDefaultRegion: number;
  toast: (message: string) => void;
  normalizeKingdomArchitecture: (id: string) => string;
  kingdomArchitectureFromEmblem: (emblem: string) => string;
}) {
  const {
    state,
    newbieDefaultRegion,
    toast,
    normalizeKingdomArchitecture,
    kingdomArchitectureFromEmblem,
  } = deps;

  function startNewbieOnboarding(
    flagColor: string,
    emblem: string,
    cityName?: string,
    architectureId?: string,
  ) {
    state.newbieFlagColor = flagColor;
    state.newbieEmblem = emblem;
    state.newbieArchitectureId = normalizeKingdomArchitecture(
      architectureId || kingdomArchitectureFromEmblem(emblem),
    );
    const region = state.newbieSelectedRegion ?? newbieDefaultRegion;
    state.newbieSelectedRegion = region;
    if (region >= 0) {
      state.regionOwnerFlagColors[region] = flagColor;
      state.regionOwnerEmblems[region] = emblem;
      state.regionOwnerArchitectureIds[region] = state.newbieArchitectureId;
      if (cityName) {
        state.regionOwnerNames[region] = cityName;
      }
    }
    toast("ÄÃƒ Táº O VÆ¯Æ NG QUá»C! ÄANG Dá»°NG THÃ€NH TRÃŒ...");
  }

  function cancelNewbieOnboarding() {
    state.newbiePhase = "select_land";
    state.newbieSelectedRegion = null;
  }

  function selectNewbieLand(regionId: number) {
    state.newbieMode = true;
    state.newbiePhase = "choose_banner";
    state.newbieSelectedRegion = regionId;
    state.selectedRegion = null;
    state.selected = null;
    state.toast =
      "CHá»ŒN Cá»œ VÃ€ BIá»‚U TÆ¯á»¢NG Rá»’I XÃC NHáº¬N XÃ‚Y THÃ€NH";
  }

  return {
    startNewbieOnboarding,
    cancelNewbieOnboarding,
    selectNewbieLand,
  };
}
