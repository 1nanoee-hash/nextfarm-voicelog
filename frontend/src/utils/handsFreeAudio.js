import {
  chooseSupportedMimeType,
  createSilenceDetector,
  requestMicrophoneStream,
  stopMediaStream,
} from "./audioRecording";


function createRecorder(
  stream
) {
  const mimeType =
    chooseSupportedMimeType();

  try {
    return mimeType
      ? new MediaRecorder(
          stream,
          {
            mimeType,
          }
        )
      : new MediaRecorder(
          stream
        );
  } catch {
    return new MediaRecorder(
      stream
    );
  }
}


export async function captureSpeechSegment({
  signal,
  maxWaitMs = 9000,
  maxSpeechMs = 8000,
  silenceDurationMs = 900,
  minSpeechMs = 420,
} = {}) {
  if (signal?.aborted) {
    return {
      aborted: true,
      blob: null,
      heardSpeech: false,
      reason: "aborted",
    };
  }

  if (
    typeof window ===
      "undefined" ||
    typeof window.MediaRecorder ===
      "undefined"
  ) {
    throw new Error(
      "MEDIA_RECORDER_UNAVAILABLE"
    );
  }

  const stream =
    await requestMicrophoneStream({
      wakeWord: true,
    });

  if (signal?.aborted) {
    stopMediaStream(
      stream
    );

    return {
      aborted: true,
      blob: null,
      heardSpeech: false,
      reason: "aborted",
    };
  }

  const recorder =
    createRecorder(
      stream
    );

  const chunks = [];

  let detector = null;
  let waitTimer = null;
  let speechTimer = null;
  let heardSpeech = false;
  let stopReason = "unknown";
  let settled = false;

  const clearTimers =
    () => {
      if (waitTimer) {
        window.clearTimeout(
          waitTimer
        );

        waitTimer = null;
      }

      if (speechTimer) {
        window.clearTimeout(
          speechTimer
        );

        speechTimer = null;
      }
    };

  return new Promise(
    (resolve, reject) => {
      const cleanup =
        () => {
          clearTimers();

          detector?.destroy();

          detector = null;

          signal?.removeEventListener(
            "abort",
            handleAbort
          );

          stopMediaStream(
            stream
          );
        };

      const finish =
        () => {
          if (settled) {
            return;
          }

          settled = true;

          cleanup();

          if (
            stopReason ===
            "aborted"
          ) {
            resolve({
              aborted: true,
              blob: null,
              heardSpeech,
              reason:
                stopReason,
            });

            return;
          }

          if (
            !heardSpeech ||
            chunks.length === 0
          ) {
            resolve({
              aborted: false,
              blob: null,
              heardSpeech,
              reason:
                stopReason,
            });

            return;
          }

          const usableChunks =
            chunks.filter(
              (chunk) =>
                chunk &&
                chunk.size > 0
            );

          if (
            usableChunks.length ===
            0
          ) {
            resolve({
              aborted: false,
              blob: null,
              heardSpeech,
              reason:
                stopReason,
            });

            return;
          }

          const mimeType =
            recorder.mimeType ||
            usableChunks[0]
              ?.type ||
            "audio/webm";

          resolve({
            aborted: false,
            blob: new Blob(
              usableChunks,
              {
                type:
                  mimeType,
              }
            ),
            heardSpeech,
            reason:
              stopReason,
          });
        };

      const stop =
        (reason) => {
          if (
            settled ||
            recorder.state ===
              "inactive"
          ) {
            if (!settled) {
              stopReason =
                reason;

              finish();
            }

            return;
          }

          stopReason =
            reason;

          try {
            recorder.requestData?.();
          } catch {
            // Browser có thể đã chuẩn bị dừng.
          }

          try {
            recorder.stop();
          } catch (error) {
            cleanup();

            if (!settled) {
              settled = true;
              reject(
                error
              );
            }
          }
        };

      function handleAbort() {
        stop(
          "aborted"
        );
      }

      recorder.ondataavailable =
        (event) => {
          if (
            event.data &&
            event.data.size > 0
          ) {
            chunks.push(
              event.data
            );
          }
        };

      recorder.onerror =
        (event) => {
          cleanup();

          if (settled) {
            return;
          }

          settled = true;

          reject(
            event?.error ||
              new Error(
                "MEDIA_RECORDER_ERROR"
              )
          );
        };

      recorder.onstop =
        finish;

      signal?.addEventListener(
        "abort",
        handleAbort,
        {
          once: true,
        }
      );

      recorder.start(
        250
      );

      detector =
        createSilenceDetector({
          stream,

          silenceThreshold:
            0.014,

          adaptiveNoise:
            true,

          calibrationMs:
            1000,

          noiseMultiplier:
            2.15,

          noiseOffset:
            0.009,

          maxAdaptiveThreshold:
            0.20,

          silenceDurationMs,

          minSpeechMs,

          onSpeechStart:
            () => {
              if (
                heardSpeech
              ) {
                return;
              }

              heardSpeech =
                true;

              if (
                waitTimer
              ) {
                window.clearTimeout(
                  waitTimer
                );

                waitTimer =
                  null;
              }

              speechTimer =
                window.setTimeout(
                  () => {
                    stop(
                      "max-speech"
                    );
                  },
                  maxSpeechMs
                );
            },

          onSilenceTimeout:
            () => {
              stop(
                "silence"
              );
            },
        });

      waitTimer =
        window.setTimeout(
          () => {
            stop(
              "no-speech"
            );
          },
          maxWaitMs
        );
    }
  );
}
