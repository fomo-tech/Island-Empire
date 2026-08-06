function asCleanName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function isPlayerIdLike(value: string, userId: string) {
  return (
    !value ||
    value === userId ||
    /^player:/i.test(value) ||
    /^lord-\d+$/i.test(value)
  );
}

/**
 * Chat must use a player's public name, never an internal id. Older chat
 * documents may contain an id-shaped name, so prefer the kingdom name when
 * the account name is one of those legacy placeholders.
 */
export function resolveChatUserName(input: {
  userId: string;
  playerName?: unknown;
  cityName?: unknown;
  storedName?: unknown;
}) {
  const candidates = [
    asCleanName(input.playerName),
    asCleanName(input.cityName),
    asCleanName(input.storedName),
  ];
  return (
    candidates.find((name) => !isPlayerIdLike(name, input.userId)) ||
    "Người chơi"
  );
}
