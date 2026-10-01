import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  captureSpeechSegment,
} from "../utils/handsFreeAudio";

import {
  extractWakeWordCommand,
} from "../utils/wakeWord";

import {
  transcribeWakeAudio,
} from "../services/wakeWordService";


function HandsFreeWakeControl({
  enabled,
  onEnabledChange,
  onWake,
  paused = false,
  disabled = false,
  language = "vi",
}) {
  const isVietnamese =
    language === "vi";

  const onWakeRef =
    useRef(onWake);

  const [
    status,
    setStatus,
  ] = useState("waiting");

  const [
    detail,
    setDetail,
  ] = useState("");

  useEffect(() => {
    onWakeRef.current =
      onWake;
  }, [
    onWake,
  ]);

  useEffect(() => {
    if (
      !enabled ||
      disabled ||
      paused
    ) {
      return undefined;
    }

    let disposed = false;

    const controller =
      new AbortController();

    const {
      signal,
    } = controller;

    const resetTimer =
      window.setTimeout(
        () => {
          if (disposed) {
            return;
          }

          setStatus(
            "waiting"
          );

          setDetail("");
        },
        0
      );

    const run =
      async () => {
        while (
          !disposed &&
          !signal.aborted
        ) {
          let segment;

          try {
            segment =
              await captureSpeechSegment({
                signal,
                maxWaitMs: 12000,
                maxSpeechMs: 2400,
                silenceDurationMs: 720,
                minSpeechMs: 420,
              });
          } catch (error) {
            if (
              signal.aborted
            ) {
              return;
            }

            console.error(
              "Hands-free wake microphone error:",
              error
            );

            setStatus(
              "error"
            );

            setDetail(
              isVietnamese
                ? "Không thể mở micrô."
                : "Unable to open microphone."
            );

            return;
          }

          if (
            disposed ||
            signal.aborted ||
            segment?.aborted
          ) {
            return;
          }

          if (
            !segment?.blob
          ) {
            continue;
          }

          setStatus(
            "transcribing"
          );

          setDetail("");

          let transcript;

          try {
            transcript =
              await transcribeWakeAudio(
                segment.blob,
                {
                  signal,
                  useNoiseReduction:
                    true,
                }
              );
          } catch (error) {
            if (
              signal.aborted ||
              error?.name ===
                "AbortError"
            ) {
              return;
            }

            console.error(
              "Hands-free wake transcription error:",
              error
            );

            setStatus(
              "error"
            );

            setDetail(
              isVietnamese
                ? "Nhận dạng thất bại."
                : "Recognition failed."
            );

            await new Promise(
              (resolve) =>
                window.setTimeout(
                  resolve,
                  700
                )
            );

            setStatus(
              "waiting"
            );

            setDetail("");

            continue;
          }

          if (!transcript) {
            setStatus(
              "waiting"
            );

            continue;
          }

          const wakeResult =
            extractWakeWordCommand(
              transcript
            );

          if (
            !wakeResult.matched
          ) {
            setStatus(
              "waiting"
            );

            setDetail(
              isVietnamese
                ? `Nghe: "${transcript}"`
                : `Heard: "${transcript}"`
            );

            await new Promise(
              (resolve) =>
                window.setTimeout(
                  resolve,
                  1100
                )
            );

            setDetail("");

            continue;
          }

          setStatus(
            "matched"
          );

          setDetail(
            isVietnamese
              ? `Đã nghe "${transcript}"`
              : `Heard "${transcript}"`
          );

          onWakeRef.current?.({
            transcript,
            trailingCommand:
              wakeResult.command,
          });

          return;
        }
      };

    void run();

    return () => {
      disposed = true;

      window.clearTimeout(
        resetTimer
      );

      controller.abort();
    };
  }, [
    enabled,
    paused,
    disabled,
    isVietnamese,
  ]);

  const displayedStatus =
    !enabled
      ? "off"
      : disabled || paused
        ? "paused"
        : status;

  const compactStatusText =
    !enabled
      ? ""
      : disabled || paused
        ? isVietnamese
          ? "Tạm dừng"
          : "Paused"
        : status ===
            "transcribing"
          ? isVietnamese
            ? "Đang kiểm tra..."
            : "Checking..."
          : status ===
              "matched"
            ? isVietnamese
              ? "Đã nhận"
              : "Detected"
            : status ===
                "error"
              ? isVietnamese
                ? "Có lỗi"
                : "Error"
              : isVietnamese
                ? 'Chờ "Bô bô"...'
                : 'Waiting for "Bô bô"...';

  return (
    <div
      className={`hands-free-main-control compact ${
        enabled
          ? "active"
          : ""
      }`}
    >
      <button
        type="button"
        className={`hands-free-main-toggle ${
          enabled
            ? "active"
            : ""
        }`}
        onClick={() =>
          onEnabledChange?.(
            !enabled
          )
        }
        disabled={
          disabled
        }
        aria-pressed={
          enabled
        }
        title={
          isVietnamese
            ? 'Bật/tắt chế độ rảnh tay. Từ đánh thức: "Bô bô".'
            : 'Toggle hands-free mode. Wake phrase: "Bô bô".'
        }
      >
        <span
          className="hands-free-toggle-icon"
          aria-hidden="true"
        >
          {enabled
            ? "🟢"
            : "🎙️"}
        </span>

        <span>
          {isVietnamese
            ? "Rảnh tay"
            : "Hands-free"}
        </span>

        <strong>
          {enabled
            ? isVietnamese
              ? "BẬT"
              : "ON"
            : isVietnamese
              ? "TẮT"
              : "OFF"}
        </strong>
      </button>

      {enabled && (
        <div
          className={`hands-free-main-status compact ${displayedStatus}`}
          role="status"
          aria-live="polite"
          title={
            detail ||
            compactStatusText
          }
        >
          <span
            className="hands-free-status-dot"
            aria-hidden="true"
          />

          <span>
            {compactStatusText}
          </span>
        </div>
      )}
    </div>
  );
}


export default HandsFreeWakeControl;
