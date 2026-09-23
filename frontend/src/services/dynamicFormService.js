const DYNAMIC_FORM_API_URL =
  import.meta.env.VITE_DYNAMIC_FORM_API_URL ||
  "http://127.0.0.1:8000/api/v1/dynamic-form/extract";

function normalizeObject(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value
    : {};
}

async function parseResponse(response) {
  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.message ||
      `Dynamic Form API error: ${response.status}`;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail)
    );
  }

  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new Error(
      "Dynamic Form API returned invalid data."
    );
  }

  return data;
}

export async function extractDynamicFormFromText({
  operation,
  transcript,
  currentFields = {},
  context = {},
}) {
  const normalizedOperation =
    String(
      operation || ""
    ).trim();

  const normalizedTranscript =
    String(
      transcript || ""
    ).trim();

  if (!normalizedOperation) {
    throw new Error(
      "Dynamic Form operation is required."
    );
  }

  if (!normalizedTranscript) {
    throw new Error(
      "Dynamic Form transcript is required."
    );
  }

  const response =
    await fetch(
      DYNAMIC_FORM_API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          operation:
            normalizedOperation,

          transcript:
            normalizedTranscript,

          current_fields:
            normalizeObject(
              currentFields
            ),

          context:
            normalizeObject(
              context
            ),
        }),
      }
    );

  return parseResponse(
    response
  );
}