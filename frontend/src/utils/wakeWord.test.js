import assert from "node:assert/strict";

import {
  extractWakeWordCommand,
  normalizeWakeWordText,
} from "./wakeWord.js";


assert.equal(
  normalizeWakeWordText(
    "  BÔ BÔ!!! "
  ),
  "bô bô"
);

for (
  const phrase of [
    "Bô bô",
    "bô bô",
    "BÔ BÔ",
    "Bồ bồ",
    "Bộ bộ",
    "Bo bo",
    "Bobo",
    "Bông bông",
    "Bô bô ơi",
  ]
) {
  assert.equal(
    extractWakeWordCommand(
      phrase
    ).matched,
    true,
    phrase
  );
}

assert.deepEqual(
  extractWakeWordCommand(
    "Bô bô thu hoạch lô A 20 kg"
  ),
  {
    matched: true,
    command:
      "thu hoạch lô A 20 kg",
  }
);

for (
  const phrase of [
    "NextFarm ơi",
    "Nông trại ơi",
    "Bò bò",
    "Con bò đang ăn cỏ",
    "Cho tôi xem nhật ký",
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
  "Wake word Bo Bo tests passed."
);
