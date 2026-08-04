// @ts-nocheck

export function createEngineChatActionsHelper(deps: {
  factions: any[];
  pushLog: (message: string) => void;
  save: () => void;
  isDestroyed: () => boolean;
}) {
  const { factions, pushLog, save, isDestroyed } = deps;

  function sendChat(msg: string) {
    pushLog(`PLAYER1: ${msg}`);
    save();

    setTimeout(() => {
      if (isDestroyed()) return;
      const msgClean = msg.toLowerCase().trim();
      const opponentFactions = factions.filter((_, idx) => idx > 0);
      const f =
        opponentFactions[Math.floor(Math.random() * opponentFactions.length)];

      let reply = "";
      if (msgClean.includes("chÃ o") || msgClean.includes("hello")) {
        reply =
          "ChÃ o má»«ng sá»© giáº£ PLAYER1! Báº£n xá»© khÃ´ng Ä‘Ã³n tiáº¿p káº» thÃ¹.";
      } else if (
        msgClean.includes("Ä‘Ã¡nh") ||
        msgClean.includes("chiáº¿m") ||
        msgClean.includes("cÆ°á»›p") ||
        msgClean.includes("táº¥n cÃ´ng")
      ) {
        reply =
          "Muá»‘n Ä‘á»™ng binh Ä‘ao sao? Kiáº¿m sáº¯c cá»§a chÃºng ta Ä‘Ã£ khÃ¡t mÃ¡u lÃ¢u rá»“i!";
      } else if (
        msgClean.includes("xin") ||
        msgClean.includes("Ä‘á»•i") ||
        msgClean.includes("giao thÆ°Æ¡ng") ||
        msgClean.includes("vÃ ng")
      ) {
        reply =
          "HÃ£y gá»­i vÃ ng sang Ä‘Ã¢y, chÃºng ta sáº½ xem xÃ©t thÃ´ng thÆ°Æ¡ng há»¯u nghá»‹!";
      } else {
        reply = f?.chat || "NgÆ°Æ¡i Ä‘ang nÃ³i gÃ¬ váº­y?";
      }
      pushLog(`${f.name}: ${reply}`);
      save();
    }, 1500);
  }

  return {
    sendChat,
  };
}
