import "dotenv/config";
import bcrypt from "bcryptjs";
import { generateWorldTerritories, type ResourceBag, type TownSnapshot } from "@island/shared";
import { closeDb } from "../db/client.js";
import { collections } from "../db/collections.js";

const EMBLEMS = ["crown", "eagle", "dragon", "lion", "swords", "shield", "tree", "mountain", "anchor"];

const FLAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#fb7185", "#38bdf8", "#4ade80", "#facc15", "#fb923c", "#f472b6", "#c084fc",
  "#818cf8", "#60a5fa", "#34d399", "#a3e635", "#fde047", "#ffedd5", "#e0e7ff", "#fae8ff"
];

const BOT_NAMES = [
  // Top 5 Overlords (Rank 1-5 - Siêu Cấp: 12 - 15 Thành trì)
  "Bá Vương Long Đế", "Võ Thánh Gia Cát", "Đại Việt Đế Quốc", "Thần Long Vương", "Bắc Băng Minh Chủ",
  // High Lords (Rank 6-15 - Hào Hùng: 6 - 9 Thành trì)
  "Phong Vân Bang Chủ", "Tử Vi Vương", "Xích Thổ Tướng Quân", "Vũ Lâm Minh Vương", "Hoàng Sha Thần Tướng",
  "Sơn Hà Đại Đế", "Huyền Vũ Thánh Vương", "Hồng Hoa Nữ Vương", "Minh Tâm Giáo Chủ", "Đại Thánh Vương",
  // Mid-tier Kingdoms (Rank 16-35 - Trung Cấp: 3 - 5 Thành trì)
  "Thiên Hạ Vô Song", "Hắc Phong Trại", "Bình Tây Đại Tướng", "Tiêu Sương Hiệp Sĩ", "Cuồng Phong Sứ Quân",
  "Nam Băng Trấn Thủ", "San Hô Lĩnh Chủ", "Thái Bình Sứ Quân", "Phạn Thiên Đế", "Đông Hải Thủy Vương",
  "Phục Hưng Vương", "Tuyệt Đỉnh Bang", "Bạch Hổ Tướng", "Chính Nghĩa Quân", "Tân Sơn Lĩnh Chủ",
  "Bát Giáp Tướng", "Thần Phong Sứ", "Vĩnh Hằng Vương", "Quang Minh Sứ", "Lôi Đình Tướng Quân",
  // Novice / Weak Players (Rank 36-50 - Tân Thủ / Yếu: 1 Thành trì)
  "Tân Thủ Lập Nghiệp", "Nông Dân Cần Mẫn", "Tiểu Sơn Lĩnh", "Mộc Mạc Thôn Chủ", "Tân Binh Gia Nhập",
  "Tiểu Bá Vương", "Bình Dân Trấn", "Gió Mới Thôn", "Hà Đông Trại", "Sơn Cước Thôn",
  "Hải Phong Lĩnh", "Tiểu Trấn Chủ", "Khai Hoang Thôn", "Viễn Đông Trại", "Yên Bình Thôn"
];

async function seed50Players() {
  console.log("🚀 Starting seeding 50 players (Strongest -> Weakest, from Many Towns -> 1 Town)...");
  const { players, saves, territoryClaims } = await collections();
  const territories = generateWorldTerritories().filter((t) => !t.isIslet);

  const now = new Date();
  const passwordHash = await bcrypt.hash("123123123", 10);

  let claimedCount = 0;
  const numTerritories = territories.length;

  for (let i = 0; i < 50; i++) {
    const rank = i + 1; // 1 to 50
    const name = BOT_NAMES[i] || `Chúa Tể #${rank}`;
    const playerId = `player:bot-${rank}`;
    const flagColor = FLAG_COLORS[i % FLAG_COLORS.length];
    const emblem = EMBLEMS[i % EMBLEMS.length];

    // Determine strength tier and town count based on rank (12-15 towns down to 1 town)
    let multiplier = 1;
    let townMaxLvl = 1;
    let baseTroops = 100;
    let researchLvl = 0;
    let territoryAssignCount = 1;

    if (rank <= 5) {
      // Tier 1: Overlords (Rank 1-5): 12 to 15 Towns/Territories per Player
      multiplier = 80; // 80M resources
      townMaxLvl = 10;
      baseTroops = 15000;
      researchLvl = 10;
      territoryAssignCount = 15 - (rank - 1); // 15, 14, 13, 12, 11 towns
    } else if (rank <= 15) {
      // Tier 2: High Lords (Rank 6-15): 6 to 9 Towns/Territories per Player
      multiplier = 25; // 25M resources
      townMaxLvl = 8;
      baseTroops = 4000;
      researchLvl = 6;
      territoryAssignCount = Math.max(6, 9 - Math.floor((rank - 6) / 3)); // 9, 8, 7, 6 towns
    } else if (rank <= 35) {
      // Tier 3: Mid-tier (Rank 16-35): 3 to 5 Towns/Territories per Player
      multiplier = 5; // 5M resources
      townMaxLvl = 5;
      baseTroops = 1000;
      researchLvl = 3;
      territoryAssignCount = Math.max(3, 5 - Math.floor((rank - 16) / 7)); // 5, 4, 3 towns
    } else {
      // Tier 4: Weak / Novice (Rank 36-50): Exactly 1 Town/Territory per Player
      multiplier = 0.5; // 500k resources
      townMaxLvl = 2;
      baseTroops = 150;
      researchLvl = 0;
      territoryAssignCount = 1; // 1 town
    }

    const resources: ResourceBag = {
      gold: Math.round(1000000 * multiplier),
      wood: Math.round(1000000 * multiplier),
      stone: Math.round(1000000 * multiplier),
      food: Math.round(1000000 * multiplier),
      iron: Math.round(1000000 * multiplier),
      coal: Math.round(1000000 * multiplier),
      sulfur: Math.round(1000000 * multiplier),
      gems: Math.round(50000 * multiplier),
    };

    // Pick territory regions evenly across the map
    const playerTowns: TownSnapshot[] = [];
    for (let tIdx = 0; tIdx < territoryAssignCount; tIdx++) {
      const terrIndex = (claimedCount * 3 + Math.floor(rank * 1.5)) % numTerritories;
      const terr = territories[terrIndex] || territories[claimedCount % numTerritories];
      claimedCount++;

      // Upsert Territory Claim
      await territoryClaims.updateOne(
        { territoryId: terr.id },
        {
          $set: {
            territoryId: terr.id,
            playerId,
            claimedAt: now,
          },
        },
        { upsert: true }
      );

      const lvl = Math.min(10, Math.max(1, townMaxLvl - Math.floor(tIdx / 2)));
      const infantryCount = Math.round(baseTroops * 0.5);
      const cavalryCount = Math.round(baseTroops * 0.35);
      const artilleryCount = Math.round(baseTroops * 0.15);
      const totalTroops = infantryCount + cavalryCount + artilleryCount;

      playerTowns.push({
        id: terr.id,
        x: Math.round(terr.x),
        y: Math.round(terr.y),
        level: lvl,
        ownerId: playerId,
        troops: totalTroops,
        infantryCount,
        cavalryCount,
        artilleryCount,
      });
    }

    // Upsert Player
    await players.updateOne(
      { _id: playerId },
      {
        $set: {
          name,
          passwordHash,
          role: "player",
          flagColor,
          emblem,
          onboardingState: "settled",
          resources,
          lastResourceCollectedAt: now,
          lastSeenAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    // Upsert Save
    await saves.updateOne(
      { playerId },
      {
        $set: {
          resources,
          towns: playerTowns,
          research: {
            sword: researchLvl,
            stirrups: researchLvl,
            cannon: researchLvl,
            travel: researchLvl,
          },
          updatedAt: now,
        },
        $setOnInsert: {
          _id: `save:${playerId}`,
          playerId,
        },
      },
      { upsert: true }
    );

    const totalPlayerTroops = playerTowns.reduce((sum, t) => sum + t.troops, 0);
    console.log(
      `  [Hạng ${rank}/50] ${name} (${playerId}) | Số Thành Trì: ${playerTowns.length} | Tổng Quân: ${totalPlayerTroops.toLocaleString("en-US")} | TN: ${(resources.gold / 1000000).toFixed(1)}M`
    );
  }

  console.log("✅ Seeded 50 players (from 15 Towns down to 1 Town) across the entire map successfully!");
}

seed50Players()
  .catch((err) => {
    console.error("❌ Error seeding 50 players:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
