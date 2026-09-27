import assert from "node:assert/strict";

import {
  extractWakeWordCommand,
  normalizeWakeWordText,
} from "./wakeWord.js";


assert.equal(
  normalizeWakeWordText(
    "  NextFarm ƠI!!! "
  ),
  "nextfarm oi"
);

for (
  const phrase of [
    "NextFarm ơi",
    "Next Farm ơi",
    "Nét farm ơi",
    "Nest farm ơi",
    "Next pham ơi",
    "Nét pham ơi",
    "Nex fam ơi",
  ]
) {
  assert.deepEqual(
    extractWakeWordCommand(
      phrase
    ),
    {
      matched: true,
      command: "",
    },
    phrase
  );
}

assert.deepEqual(
  extractWakeWordCommand(
    "NextFarm ơi thu hoạch lô A 20 kg"
  ),
  {
    matched: true,
    command:
      "thu hoạch lô A 20 kg",
  }
);

assert.deepEqual(
  extractWakeWordCommand(
    "Nét pham ơi cho tôi xem nhật ký gần nhất"
  ),
  {
    matched: true,
    command:
      "cho tôi xem nhật ký gần nhất",
  }
);

for (
  const phrase of [
    "Cho tôi xem nhật ký NextFarm",
    "NextFarm",
    "Best farm ơi",
    "Test farm ơi",
    "Hôm nay thời tiết thế nào",
  ]
) {
  assert.deepEqual(
    extractWakeWordCommand(
      phrase
    ),
    {
      matched: false,
      command: "",
    },
    phrase
  );
}

console.log(
  "Wake word V2 tests passed."
);
