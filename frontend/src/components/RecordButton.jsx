import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  chooseSupportedMimeType,
  getRecordingErrorMessage,
  requestMicrophoneStream,
  stopMediaStream,
} from "../utils/audioRecording";

const EMPTY_AI_DATA = {
  lot: "",
  work: "",
  material: "",
  quantity: "",
  unit: "",
  time: "",
};

function formatDuration(
  totalSeconds
) {
  const safeSeconds =
    Math.max(
      0,
      Number(totalSeconds) || 0
    );

  const minutes =
    Math.floor(
      safeSeconds / 60
    );

  const seconds =
    safeSeconds % 60;

  return `${String(
    minutes
  ).padStart(
    2,
    "0"
  )}:${String(
    seconds
  ).padStart(
    2,
    "0"
  )}`;
}

function RecordButton({
  audioUrl,
  setAudioUrl,
  setAudioBlob,
  setTranscript,
  setAiData,
  setMessage,
  isConfirmed = false,
  text,
  language = "vi",
}) {
  const isVietnamese =
    language === "vi";

  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const elapsedSecondsRef =
    useRef(0);

  const [
    isPreparing,
    setIsPreparing,
  ] = useState(false);

  const recorderRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const chunksRef =
    useRef([]);

  const timerRef =
    useRef(null);

  const ownedAudioUrlRef =
    useRef(null);

  const showMessage = (
    type,
    messageText
  ) => {
    setMessage?.({
      type,
      text: messageText,
    });
  };

  const clearTimer = () => {
    if (
      timerRef.current
    ) {
      window.clearInterval(
        timerRef.current
      );

      timerRef.current =
        null;
    }
  };

  const cleanupStream =
    () => {
      stopMediaStream(
        streamRef.current
      );

      streamRef.current =
        null;
    };

  const releaseRecorder =
    () => {
      recorderRef.current =
        null;

      chunksRef.current = [];
    };

  const revokeOwnedAudioUrl =
    () => {
      const url =
        ownedAudioUrlRef.current;

      if (!url) {
        return;
      }

      try {
        URL.revokeObjectURL(
          url
        );
      } catch {
        // Ignore cleanup error.
      }

      ownedAudioUrlRef.current =
        null;
    };

  const resetResultForNewRecording =
    () => {
      revokeOwnedAudioUrl();

      setAudioUrl?.(null);
      setAudioBlob?.(null);
      setTranscript?.("");

      setAiData?.({
        ...EMPTY_AI_DATA,
      });
    };

  const finishRecording = (
    recorder,
    recordedSeconds
  ) => {
    const chunks =
      chunksRef.current.filter(
        (chunk) =>
          chunk &&
          chunk.size > 0
      );

    clearTimer();
    cleanupStream();

    setIsRecording(
      false
    );

    if (
      chunks.length === 0
    ) {
      releaseRecorder();

      showMessage(
        "error",
        isVietnamese
          ? "Không nhận được dữ liệu âm thanh. Hãy thử ghi lại."
          : "No audio data was captured. Please record again."
      );

      return;
    }

    const mimeType =
      recorder?.mimeType ||
      chunks[0]?.type ||
      "audio/webm";

    const blob =
      new Blob(
        chunks,
        {
          type: mimeType,
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    ownedAudioUrlRef.current =
      url;

    setAudioBlob?.(
      blob
    );

    setAudioUrl?.(
      url
    );

    releaseRecorder();

    showMessage(
      "success",
      isVietnamese
        ? `✅ Đã ghi âm ${formatDuration(
            recordedSeconds
          )}. Bạn có thể gửi bản ghi cho AI.`
        : `✅ Recorded ${formatDuration(
            recordedSeconds
          )}. You can now send the recording to AI.`
    );
  };

  const startRecording =
    async () => {
      if (
        isRecording ||
        isConfirmed ||
        isPreparing
      ) {
        return;
      }

      setIsPreparing(
        true
      );

      try {
        if (
          typeof window
            .MediaRecorder ===
          "undefined"
        ) {
          throw new Error(
            "MEDIA_RECORDER_UNAVAILABLE"
          );
        }

        resetResultForNewRecording();

        const stream =
          await requestMicrophoneStream();

        streamRef.current =
          stream;

        const mimeType =
          chooseSupportedMimeType();

        let recorder;

        try {
          recorder =
            mimeType
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
          recorder =
            new MediaRecorder(
              stream
            );
        }

        recorderRef.current =
          recorder;

        chunksRef.current =
          [];

        recorder.ondataavailable =
          (event) => {
            if (
              event.data &&
              event.data.size >
                0
            ) {
              chunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onerror =
          (event) => {
            console.error(
              "MediaRecorder error:",
              event?.error ||
                event
            );

            showMessage(
              "error",
              isVietnamese
                ? "Đã xảy ra lỗi trong lúc ghi âm. Hãy thử lại."
                : "An error occurred while recording. Please try again."
            );
          };

        recorder.onstop = () => {
          const recordedSeconds =
            elapsedSecondsRef.current;

          finishRecording(
            recorder,
            recordedSeconds
          );
        };

        recorder.start(
          250
        );

        elapsedSecondsRef.current =
          0;

        setElapsedSeconds(
          0
        );

        setIsRecording(
          true
        );

        clearTimer();

        timerRef.current =
          window.setInterval(
            () => {
              elapsedSecondsRef.current +=
                1;

              setElapsedSeconds(
                elapsedSecondsRef.current
              );
            },
            1000
          );

        showMessage(
          "success",
          isVietnamese
            ? "🎙️ Đang ghi âm... Nhấn nút đỏ để dừng."
            : "🎙️ Recording... Tap the red button to stop."
        );
      } catch (error) {
        console.error(
          "Start recording error:",
          error
        );

        clearTimer();
        cleanupStream();
        releaseRecorder();

        setIsRecording(
          false
        );

        showMessage(
          "error",
          getRecordingErrorMessage(
            error,
            language
          )
        );
      } finally {
        setIsPreparing(
          false
        );
      }
    };

  const stopRecording =
    () => {
      const recorder =
        recorderRef.current;

      if (
        !recorder ||
        recorder.state ===
          "inactive"
      ) {
        clearTimer();
        cleanupStream();

        setIsRecording(
          false
        );

        return;
      }

      try {
        if (
          typeof recorder.requestData ===
          "function"
        ) {
          try {
            recorder.requestData();
          } catch {
            // Ignore.
          }
        }

        recorder.stop();
      } catch (error) {
        console.error(
          "Stop recording error:",
          error
        );

        clearTimer();
        cleanupStream();
        releaseRecorder();

        setIsRecording(
          false
        );

        showMessage(
          "error",
          isVietnamese
            ? "Không thể kết thúc bản ghi đúng cách. Hãy thử ghi lại."
            : "The recording could not be stopped correctly. Please record again."
        );
      }
    };

  const handleRecordClick =
    () => {
      if (
        isRecording
      ) {
        stopRecording();

        return;
      }

      startRecording();
    };

  useEffect(() => {
    return () => {
      clearTimer();

      const recorder =
        recorderRef.current;

      if (
        recorder &&
        recorder.state !==
          "inactive"
      ) {
        try {
          recorder.stop();
        } catch {
          // Ignore cleanup error.
        }
      }

      cleanupStream();
      revokeOwnedAudioUrl();
    };
  }, []);

  const buttonLabel =
    isConfirmed
      ? isVietnamese
        ? "Nhật ký đã được xác nhận"
        : "Log confirmed"
      : isPreparing
        ? isVietnamese
          ? "Đang mở microphone..."
          : "Preparing microphone..."
        : isRecording
          ? isVietnamese
            ? "Nhấn để dừng"
            : "Tap to stop"
          : isVietnamese
            ? "Nhấn để ghi âm"
            : "Tap to record";

  return (
    <div className="record-section">
      <div className="record-control-wrap">
        <button
          type="button"
          className={`record-btn ${
            isRecording
              ? "recording"
              : ""
          } ${
            isPreparing
              ? "preparing"
              : ""
          }`}
          onClick={
            handleRecordClick
          }
          disabled={
            isConfirmed ||
            isPreparing
          }
          aria-pressed={
            isRecording
          }
          aria-label={
            buttonLabel
          }
        >
          <span
            className="record-btn-icon"
            aria-hidden="true"
          >
            {isPreparing
              ? "…"
              : isRecording
                ? "■"
                : "🎙️"}
          </span>
        </button>

        {isRecording && (
          <span
            className="record-live-dot"
            aria-hidden="true"
          />
        )}
      </div>

      <div
        className={`record-status ${
          isRecording
            ? "recording"
            : ""
        }`}
        aria-live="polite"
      >
        {isRecording ? (
          <>
            <span className="record-status-main">
              {isVietnamese
                ? "Đang ghi âm"
                : "Recording"}
            </span>

            <strong>
              {formatDuration(
                elapsedSeconds
              )}
            </strong>
          </>
        ) : (
          <>
            <span className="record-status-main">
              {buttonLabel}
            </span>

            {!isConfirmed &&
              !isPreparing && (
                <span className="record-status-sub">
                  {isVietnamese
                    ? "Chạm đúng nút micro để bắt đầu"
                    : "Tap the microphone button to start"}
                </span>
              )}
          </>
        )}
      </div>

      {audioUrl && (
        <div className="audio-player">
          <div className="audio-player-header">
            <div>
              <span className="audio-player-kicker">
                {isVietnamese
                  ? "BẢN GHI"
                  : "RECORDING"}
              </span>

              <h3>
                {isVietnamese
                  ? "Bản ghi vừa tạo"
                  : "Latest recording"}
              </h3>
            </div>

            <span className="audio-ready-badge">
              ✓{" "}
              {isVietnamese
                ? "Sẵn sàng"
                : "Ready"}
            </span>
          </div>

          <audio
            controls
            playsInline
            preload="metadata"
            src={
              audioUrl
            }
          >
            {text?.audio
              ?.unsupported ||
              (isVietnamese
                ? "Trình duyệt không hỗ trợ phát âm thanh."
                : "Your browser does not support audio playback.")}
          </audio>
        </div>
      )}
    </div>
  );
}

export default RecordButton;