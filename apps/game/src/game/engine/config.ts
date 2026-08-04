export const MAP_UNITS_TO_KM = 0.18;

export const COLORS = {
  blue: "#2f70d7",
  red: "#d74635",
  green: "#44a13d",
  purple: "#8e45bc",
  gold: "#d89b21",
  pink: "#cf5d83",
  teal: "#48a88e",
  gray: "#8d95a1",
};

/** Create per-game mutable configuration without sharing server overrides. */
export function createGameConfig() {
  return {
    infantryCostGold: 100,
    infantryCostWood: 30,
    infantryTroopsValue: 18,
    cavalryCostGold: 170,
    cavalryCostWood: 40,
    cavalryCostStone: 45,
    cavalryTroopsValue: 34,
    artilleryCostGold: 240,
    artilleryCostStone: 120,
    artilleryTroopsValue: 58,
    infantryCostFood: 55,
    cavalryCostFood: 90,
    cavalryCostIron: 12,
    artilleryCostIron: 85,
    artilleryCostCoal: 35,
    artilleryCostSulfur: 25,
    infantryPopulationCost: 4,
    cavalryPopulationCost: 7,
    artilleryPopulationCost: 12,
    settlerSpeed: 35,
    infantrySpeed: 45,
    cavalrySpeed: 75,
    artillerySpeed: 30,
    shipSpeed: 25,
    gameHourSeconds: 30,
    maxBattleDuration: 12,
  };
}
