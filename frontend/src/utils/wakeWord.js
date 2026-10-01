const WAKE_VARIANTS =
  new Set([
    "bôbô",
    "bôbồ",
    "bồbô",
    "bồbồ",
    "bộbộ",
    "bôbộ",
    "bộbô",
    "bobo",
    "bôngbông",
    "bongbong",
  ]);


export function normalizeWakeWordText(
  value
) {
  return String(
    value ?? ""
  )
    .toLowerCase()
    .normalize("NFC")
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}


function getWakeWordCount(
  words
) {
  if (!words.length) {
    return 0;
  }

  if (
    WAKE_VARIANTS.has(
      words[0]
    )
  ) {
    return 1;
  }

  if (
    words.length >= 2 &&
    WAKE_VARIANTS.has(
      `${words[0]}${words[1]}`
    )
  ) {
    return 2;
  }

  return 0;
}


export function extractWakeWordCommand(
  value
) {
  const original =
    String(
      value ?? ""
    ).trim();

  const normalized =
    normalizeWakeWordText(
      original
    );

  if (!normalized) {
    return {
      matched: false,
      command: "",
    };
  }

  const normalizedWords =
    normalized.split(" ");

  const originalWords =
    original.split(/\s+/);

  const wakeWordCount =
    getWakeWordCount(
      normalizedWords
    );

  if (!wakeWordCount) {
    return {
      matched: false,
      command: "",
    };
  }

  let commandStart =
    wakeWordCount;

  if (
    normalizedWords[
      commandStart
    ] === "ơi" ||
    normalizedWords[
      commandStart
    ] === "oi"
  ) {
    commandStart += 1;
  }

  return {
    matched: true,
    command:
      originalWords
        .slice(
          commandStart
        )
        .join(" ")
        .trim(),
  };
}
