export const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

export function chooseSupportedMimeType() {
  if (
    typeof window === "undefined" ||
    typeof window.MediaRecorder ===
      "undefined"
  ) {
    return "";
  }

  if (
    typeof window.MediaRecorder
      .isTypeSupported !== "function"
  ) {
    return "";
  }

  return (
    AUDIO_MIME_CANDIDATES.find(
      (type) =>
        window.MediaRecorder.isTypeSupported(
          type
        )
    ) || ""
  );
}

export function stopMediaStream(
  stream
) {
  if (!stream) {
    return;
  }

  stream
    .getTracks()
    .forEach((track) => {
      try {
        track.stop();
      } catch {
        // Ignore cleanup errors.
      }
    });
}

export async function requestMicrophoneStream(options = {}) {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined"
  ) {
    throw new Error(
      "BROWSER_ENVIRONMENT_UNAVAILABLE"
    );
  }

  if (!window.isSecureContext) {
    throw new Error(
      "INSECURE_CONTEXT"
    );
  }

  if (
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices
      .getUserMedia !== "function"
  ) {
    throw new Error(
      "GET_USER_MEDIA_UNAVAILABLE"
    );
  }

  const wakeWordMode =
    Boolean(
      options?.wakeWord
    );

  const preferredConstraints = {
    audio: {
      echoCancellation: {
        ideal: true,
      },

      noiseSuppression: {
        ideal: true,
      },

      autoGainControl: {
        ideal:
          !wakeWordMode,
      },

      channelCount: {
        ideal: 1,
      },

      ...(wakeWordMode
        ? {
            sampleRate: {
              ideal: 16000,
            },
          }
        : {}),
    },

    video: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(
      preferredConstraints
    );
  } catch (error) {
    /*
      Một số browser cũ có thể
      không thích advanced constraints.

      Nếu vậy thử lại với
      audio: true đơn giản nhất.
    */

    if (
      error?.name ===
        "OverconstrainedError" ||
      error?.name === "TypeError"
    ) {
      return navigator.mediaDevices.getUserMedia(
        {
          audio: true,
          video: false,
        }
      );
    }

    throw error;
  }
}

/*
 * Voice Activity Detection (VAD) helper.
 *
 * Watches the live microphone stream and calls `onSilenceTimeout` once the
 * user has spoken for at least `minSpeechMs` and then stayed quiet for
 * `silenceDurationMs`. This is what lets the record button behave like a
 * chat-app mic: tap once to start, and it turns itself off automatically
 * when you stop talking, instead of requiring press-and-hold.
 *
 * Returns null when the Web Audio API isn't available (very old browsers).
 * Callers must treat that as "no auto-stop available" and fall back to a
 * manual tap-to-stop + a hard max-duration timer.
 */
export function createSilenceDetector({
  stream,
  onSpeechStart,
  onSilenceTimeout,
  silenceThreshold = 0.015,
  silenceDurationMs = 1400,
  minSpeechMs = 250,
  checkIntervalMs = 80,
  adaptiveNoise = false,
  calibrationMs = 450,
  noiseMultiplier = 1.7,
  noiseOffset = 0.006,
  maxAdaptiveThreshold = 0.20,
}) {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  let audioContext;
  let source;
  let highPass;
  let lowPass;
  let analyser;

  try {
    audioContext =
      new AudioContextClass();

    source =
      audioContext.createMediaStreamSource(
        stream
      );

    /*
     * Chỉ dùng cho VAD:
     * bỏ bớt tiếng gió/quạt tần số thấp và nhiễu cao tần.
     * Audio ghi thật vẫn giữ nguyên stream.
     */
    highPass =
      audioContext.createBiquadFilter();

    highPass.type =
      "highpass";

    highPass.frequency.value =
      140;

    highPass.Q.value =
      0.707;

    lowPass =
      audioContext.createBiquadFilter();

    lowPass.type =
      "lowpass";

    lowPass.frequency.value =
      4200;

    lowPass.Q.value =
      0.707;

    analyser =
      audioContext.createAnalyser();

    analyser.fftSize =
      1024;

    analyser.smoothingTimeConstant =
      0.65;

    source.connect(
      highPass
    );

    highPass.connect(
      lowPass
    );

    lowPass.connect(
      analyser
    );
  } catch {
    try {
      audioContext?.close();
    } catch {
      // Ignore cleanup error.
    }

    return null;
  }

  const dataArray =
    new Uint8Array(
      analyser.fftSize
    );

  const detectorStartedAt =
    Date.now();

  let noiseFloor = null;
  let soundStartedAt = null;
  let speechConfirmed = false;
  let silenceStartedAt = null;
  let intervalId = null;
  let stopped = false;

  const computeRms = () => {
    analyser.getByteTimeDomainData(
      dataArray
    );

    let sumSquares = 0;

    for (
      let index = 0;
      index < dataArray.length;
      index += 1
    ) {
      const normalized =
        (dataArray[index] - 128) /
        128;

      sumSquares +=
        normalized *
        normalized;
    }

    return Math.sqrt(
      sumSquares /
      dataArray.length
    );
  };

  const updateNoiseFloor =
    (rms, weight) => {
      if (
        noiseFloor === null
      ) {
        noiseFloor = rms;

        return;
      }

      noiseFloor =
        noiseFloor *
          (1 - weight) +
        rms *
          weight;
    };

  const getCurrentThreshold =
    () => {
      if (
        !adaptiveNoise ||
        noiseFloor === null
      ) {
        return silenceThreshold;
      }

      return Math.min(
        maxAdaptiveThreshold,
        Math.max(
          silenceThreshold,
          noiseFloor *
            noiseMultiplier +
            noiseOffset
        )
      );
    };

  const tick = () => {
    if (stopped) {
      return;
    }

    const rms =
      computeRms();

    const now =
      Date.now();

    if (
      adaptiveNoise &&
      !speechConfirmed &&
      now -
        detectorStartedAt <
        calibrationMs
    ) {
      updateNoiseFloor(
        rms,
        0.18
      );

      soundStartedAt =
        null;

      return;
    }

    const threshold =
      getCurrentThreshold();

    if (
      adaptiveNoise &&
      !speechConfirmed &&
      rms < threshold
    ) {
      /*
       * Theo dõi tiếng nền chậm để thích nghi khi quạt/gió
       * thay đổi, nhưng không đuổi theo giọng nói.
       */
      updateNoiseFloor(
        rms,
        0.025
      );
    }

    if (rms >= threshold) {
      if (!soundStartedAt) {
        soundStartedAt =
          now;
      }

      if (
        !speechConfirmed &&
        now -
          soundStartedAt >=
          minSpeechMs
      ) {
        speechConfirmed =
          true;

        onSpeechStart?.();
      }

      if (speechConfirmed) {
        silenceStartedAt =
          null;
      }

      return;
    }

    if (!speechConfirmed) {
      /*
       * Một tiếng động/gió ngắn không được cộng dồn thành lời nói.
       */
      soundStartedAt =
        null;

      return;
    }

    if (!silenceStartedAt) {
      silenceStartedAt =
        now;

      return;
    }

    if (
      now -
        silenceStartedAt >=
      silenceDurationMs
    ) {
      stopped = true;

      if (intervalId) {
        window.clearInterval(
          intervalId
        );
      }

      onSilenceTimeout?.();
    }
  };

  intervalId =
    window.setInterval(
      tick,
      checkIntervalMs
    );

  return {
    destroy: () => {
      stopped = true;

      if (intervalId) {
        window.clearInterval(
          intervalId
        );

        intervalId = null;
      }

      try {
        source.disconnect();
      } catch {
        // Ignore cleanup error.
      }

      try {
        highPass.disconnect();
      } catch {
        // Ignore cleanup error.
      }

      try {
        lowPass.disconnect();
      } catch {
        // Ignore cleanup error.
      }

      try {
        analyser.disconnect();
      } catch {
        // Ignore cleanup error.
      }

      try {
        audioContext.close();
      } catch {
        // Ignore cleanup error.
      }
    },
  };
}


export function getRecordingErrorMessage(
  error,
  language = "vi"
) {
  const isVietnamese =
    language === "vi";

  const code =
    error?.message || "";

  const name =
    error?.name || "";

  if (
    code ===
    "INSECURE_CONTEXT"
  ) {
    return isVietnamese
      ? "Microphone chỉ hoạt động trên kết nối HTTPS an toàn. Hãy mở NextFarm bằng địa chỉ HTTPS."
      : "Microphone access requires a secure HTTPS connection. Open NextFarm using an HTTPS URL.";
  }

  if (
    code ===
    "GET_USER_MEDIA_UNAVAILABLE"
  ) {
    return isVietnamese
      ? "Trình duyệt này không cung cấp API truy cập microphone. Hãy cập nhật trình duyệt hoặc thử Safari, Chrome hoặc Samsung Internet mới hơn."
      : "This browser does not expose the microphone API. Update the browser or try a newer Safari, Chrome, or Samsung Internet.";
  }

  if (
    code ===
    "MEDIA_RECORDER_UNAVAILABLE"
  ) {
    return isVietnamese
      ? "Trình duyệt này chưa hỗ trợ MediaRecorder để ghi âm."
      : "This browser does not support MediaRecorder audio recording.";
  }

  if (
    name === "NotAllowedError" ||
    name ===
      "PermissionDeniedError"
  ) {
    return isVietnamese
      ? "Quyền microphone đang bị từ chối. Hãy cho phép Microphone cho NextFarm trong cài đặt trình duyệt rồi thử lại."
      : "Microphone permission was denied. Allow microphone access for NextFarm in your browser settings and try again.";
  }

  if (
    name === "NotFoundError" ||
    name ===
      "DevicesNotFoundError"
  ) {
    return isVietnamese
      ? "Không tìm thấy microphone trên thiết bị."
      : "No microphone was found on this device.";
  }

  if (
    name ===
      "NotReadableError" ||
    name ===
      "TrackStartError"
  ) {
    return isVietnamese
      ? "Không thể sử dụng microphone. Microphone có thể đang bị ứng dụng khác sử dụng hoặc hệ điều hành đang chặn."
      : "The microphone could not be opened. Another app may be using it, or the operating system may be blocking access.";
  }

  if (
    name === "SecurityError"
  ) {
    return isVietnamese
      ? "Trình duyệt đang chặn quyền microphone vì lý do bảo mật."
      : "The browser blocked microphone access for security reasons.";
  }

  if (
    name === "AbortError"
  ) {
    return isVietnamese
      ? "Quá trình mở microphone bị gián đoạn. Hãy thử lại."
      : "Microphone startup was interrupted. Please try again.";
  }

  return isVietnamese
    ? "Không thể bắt đầu ghi âm. Hãy kiểm tra quyền microphone và thử lại."
    : "Unable to start recording. Check microphone permissions and try again.";
}