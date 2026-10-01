const AUDIO_UPLOAD_URL =
  import.meta.env
    .VITE_AI_API_URL ||
  "http://localhost:8000/api/v1/audio/upload";


const TRANSCRIBE_URL =
  import.meta.env
    .VITE_AI_TRANSCRIBE_URL ||
  AUDIO_UPLOAD_URL.replace(
    /\/upload\/?$/,
    "/transcribe"
  );


function getFileExtension(
  mimeType
) {
  const value =
    String(
      mimeType || ""
    ).toLowerCase();

  if (
    value.includes(
      "ogg"
    )
  ) {
    return "ogg";
  }

  if (
    value.includes(
      "mp4"
    )
  ) {
    return "m4a";
  }

  return "webm";
}


export async function transcribeWakeAudio(
  audioBlob,
  {
    signal,
    useNoiseReduction = true,
  } = {}
) {
  if (
    !(audioBlob instanceof Blob) ||
    audioBlob.size === 0
  ) {
    throw new Error(
      "Đoạn âm thanh không hợp lệ."
    );
  }

  const formData =
    new FormData();

  const extension =
    getFileExtension(
      audioBlob.type
    );

  formData.append(
    "file",
    audioBlob,
    `hands-free.${extension}`
  );

  formData.append(
    "use_noise_reduction",
    String(
      useNoiseReduction
    )
  );

  const response =
    await fetch(
      TRANSCRIBE_URL,
      {
        method: "POST",
        body: formData,
        signal,
      }
    );

  let result;

  try {
    result =
      await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    const message =
      result?.message ||
      result?.detail ||
      "Không thể nhận dạng đoạn âm thanh.";

    throw new Error(
      typeof message ===
        "string"
        ? message
        : JSON.stringify(
            message
          )
    );
  }

  const transcript =
    result?.data
      ?.transcript ??
    result?.transcript ??
    "";

  return String(
    transcript
  ).trim();
}


export function getWakeTranscribeUrl() {
  return TRANSCRIBE_URL;
}
