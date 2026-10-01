from pathlib import Path
import re

import whisper

from app.core.config import settings
from app.services.transcript_correction import (
    correct_transcript,
)
from app.utils.logger import logger


MODEL_NAME = settings.WHISPER_MODEL

_model = whisper.load_model(
    MODEL_NAME
)


def has_excessive_repetition(
    text: str,
) -> bool:
    if not text:
        return False

    pattern = re.compile(
        r"""
        (
            \b[^\W\d_]+\b
        )
        (?:
            [\s,.;:!?]+
            \1
        ){3,}
        """,
        flags=(
            re.IGNORECASE
            | re.VERBOSE
        ),
    )

    return bool(
        pattern.search(text)
    )


def transcribe_audio(
    file_path: str | Path,
) -> str:
    audio_path = Path(
        file_path
    )

    if not audio_path.exists():
        raise FileNotFoundError(
            (
                "Audio file not found: "
                f"{audio_path}"
            )
        )

    logger.info(
        (
            "Whisper transcribe start | "
            "model=%s | language=%s | "
            "file=%s"
        ),
        MODEL_NAME,
        settings.WHISPER_LANGUAGE,
        audio_path,
    )

    result = _model.transcribe(
        str(audio_path),

        language=(
            settings.WHISPER_LANGUAGE
        ),

        task="transcribe",

        initial_prompt=settings.WHISPER_INITIAL_PROMPT,

        fp16=False,

        temperature=0,

        beam_size=5,

        condition_on_previous_text=False,
    )

    raw_text = str(
        result.get(
            "text",
            "",
        )
    ).strip()

    logger.info(
        (
            "Whisper raw transcript | "
            "text=%s"
        ),
        raw_text,
    )

    if has_excessive_repetition(
        raw_text
    ):
        logger.warning(
            (
                "Whisper pathological "
                "repetition detected | "
                "text=%s"
            ),
            raw_text,
        )

    candidate_text = (
        raw_text
    )

    logger.info(
        (
            "Whisper transcript "
            "passed to correction | "
            "text=%s"
        ),
        candidate_text,
    )

    corrected_text = (
        correct_transcript(
            candidate_text
        )
    )

    logger.info(
        (
            "Transcript after "
            "correction | text=%s"
        ),
        corrected_text,
    )

    return corrected_text

def transcribe_wake_audio(
    file_path: str | Path,
) -> str:
    """
    Short-utterance transcription for the wake phrase.

    This deliberately does NOT use the farming-domain initial prompt.
    On noise-only clips that prompt can bias Whisper toward words such
    as "thu hoạch" even when nobody spoke.
    """

    audio_path = Path(
        file_path
    )

    if not audio_path.exists():
        raise FileNotFoundError(
            (
                "Audio file not found: "
                f"{audio_path}"
            )
        )

    logger.info(
        (
            "Wake transcription start | "
            "model=%s | language=%s | "
            "file=%s"
        ),
        MODEL_NAME,
        settings.WHISPER_LANGUAGE,
        audio_path,
    )

    result = _model.transcribe(
        str(audio_path),

        language=(
            settings.WHISPER_LANGUAGE
        ),

        task="transcribe",

        initial_prompt="Bô bô.",

        fp16=False,

        temperature=0,

        beam_size=5,

        condition_on_previous_text=False,

        no_speech_threshold=0.55,

        logprob_threshold=-1.0,

        compression_ratio_threshold=2.2,
    )

    raw_text = str(
        result.get(
            "text",
            "",
        )
    ).strip()

    if not raw_text:
        return ""

    if has_excessive_repetition(
        raw_text
    ):
        logger.info(
            (
                "Wake transcription rejected: "
                "repetition | text=%s"
            ),
            raw_text,
        )

        return ""

    if len(raw_text) > 80:
        logger.info(
            (
                "Wake transcription rejected: "
                "too long | text=%s"
            ),
            raw_text,
        )

        return ""

    segments = (
        result.get(
            "segments",
            [],
        )
        or []
    )

    if segments:
        confident_segments = []

        for segment in segments:
            no_speech_probability = float(
                segment.get(
                    "no_speech_prob",
                    1.0,
                )
            )

            average_log_probability = float(
                segment.get(
                    "avg_logprob",
                    -99.0,
                )
            )

            compression_ratio = float(
                segment.get(
                    "compression_ratio",
                    0.0,
                )
            )

            if (
                no_speech_probability < 0.55
                and average_log_probability > -1.25
                and compression_ratio < 2.2
            ):
                confident_segments.append(
                    segment
                )

        if not confident_segments:
            logger.info(
                (
                    "Wake transcription rejected: "
                    "low confidence | text=%s"
                ),
                raw_text,
            )

            return ""

    corrected_text = (
        correct_transcript(
            raw_text
        )
    )

    logger.info(
        (
            "Wake transcription accepted | "
            "text=%s"
        ),
        corrected_text,
    )

    return corrected_text
