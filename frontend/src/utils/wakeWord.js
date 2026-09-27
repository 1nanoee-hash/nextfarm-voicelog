const WAKE_WORD_COMPACT_VARIANTS =
  new Set([
    "nextfarm",
    "nexfarm",
    "netfarm",
    "nestfarm",
    "nextpham",
    "nexpham",
    "netpham",
    "nestpham",
    "nextform",
    "nexform",
    "netform",
    "nextfam",
    "nexfam",
    "netfam",
    "nextfan",
    "nexfan",
  ]);


export function normalizeWakeWordText(
  value
) {
  return String(
    value ?? ""
  )
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/đ/g, "d")
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}


function levenshteinDistance(
  left,
  right
) {
  const a =
    String(left ?? "");

  const b =
    String(right ?? "");

  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  let previous =
    Array.from(
      {
        length:
          b.length + 1,
      },
      (_, index) =>
        index
    );

  for (
    let row = 1;
    row <= a.length;
    row += 1
  ) {
    const current = [
      row,
    ];

    for (
      let column = 1;
      column <= b.length;
      column += 1
    ) {
      const cost =
        a[row - 1] ===
        b[column - 1]
          ? 0
          : 1;

      current[column] =
        Math.min(
          current[
            column - 1
          ] + 1,
          previous[
            column
          ] + 1,
          previous[
            column - 1
          ] + cost
        );
    }

    previous =
      current;
  }

  return previous[
    b.length
  ];
}


function isLikelyWakeName(
  compactValue
) {
  const compact =
    String(
      compactValue ?? ""
    );

  if (
    !compact ||
    !compact.startsWith("n")
  ) {
    return false;
  }

  if (
    WAKE_WORD_COMPACT_VARIANTS
      .has(compact)
  ) {
    return true;
  }

  if (
    compact.length < 6 ||
    compact.length > 10
  ) {
    return false;
  }

  const looksLikeFarmWord =
    compact.includes("farm") ||
    compact.includes("form") ||
    compact.includes("fam") ||
    compact.includes("fan") ||
    compact.includes("pham");

  if (!looksLikeFarmWord) {
    return false;
  }

  const distance =
    levenshteinDistance(
      compact,
      "nextfarm"
    );

  const similarity =
    1 -
    distance /
      Math.max(
        compact.length,
        "nextfarm".length
      );

  return (
    similarity >= 0.84
  );
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

  const oiIndex =
    normalizedWords
      .slice(0, 4)
      .findIndex(
        (word) =>
          word === "oi"
      );

  if (oiIndex <= 0) {
    return {
      matched: false,
      command: "",
    };
  }

  const wakeName =
    normalizedWords
      .slice(
        0,
        oiIndex
      )
      .join("");

  if (
    !isLikelyWakeName(
      wakeName
    )
  ) {
    return {
      matched: false,
      command: "",
    };
  }

  return {
    matched: true,
    command:
      originalWords
        .slice(
          oiIndex + 1
        )
        .join(" ")
        .trim(),
  };
}
