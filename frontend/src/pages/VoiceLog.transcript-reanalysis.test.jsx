// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

afterEach(() => {
  cleanup();
});

vi.mock("../components/Header", () => ({ default: () => null }));
vi.mock("../components/WorkflowStepper", () => ({ default: () => null }));
vi.mock("../components/RecordButton", () => ({ default: () => null }));
vi.mock("../components/HandsFreeWakeControl", () => ({ default: () => null }));

vi.mock(
  "../components/TranscriptBox",
  () => ({
    default: ({
      transcript,
      onTranscriptChange,
      needsReanalysis,
      onReanalyze,
    }) => (
      <div>
        <div data-testid="transcript">
          {transcript}
        </div>

        <button
          type="button"
          data-testid="edit-transcript"
          onClick={() =>
            onTranscriptChange?.(
              "Hôm nay bón 30 kg phân NPK cho lô B lúc 09:15."
            )
          }
        >
          Sửa nội dung
        </button>

        {needsReanalysis && (
          <button
            type="button"
            data-testid="reanalyze-transcript"
            onClick={onReanalyze}
          >
            Phân tích lại
          </button>
        )}
      </div>
    ),
  })
);

vi.mock("../components/ActionButtons", () => ({ default: () => null }));

vi.mock(
  "../components/OperationSelector",
  () => ({
    default: ({ operation }) => (
      <div data-testid="operation">
        {operation}
      </div>
    ),
  })
);

vi.mock(
  "../components/DynamicForm",
  () => ({
    default: ({ dynamicForm }) => (
      <pre data-testid="dynamic-form">
        {JSON.stringify(dynamicForm)}
      </pre>
    ),
  })
);

vi.mock("../services/audioService", () => ({ uploadAudio: vi.fn() }));
vi.mock("../services/photoUploadService", () => ({ uploadPhoto: vi.fn() }));

vi.mock(
  "../services/dynamicFormService",
  () => ({
    extractDynamicFormFromText: vi.fn(),
  })
);

vi.mock(
  "../services/integrationService",
  () => ({
    resolveMasterData: vi.fn(),
    validateCultivationLog: vi.fn(),
    saveCultivationLog: vi.fn(),
    updateCultivationLog: vi.fn(),
    saveDynamicOperation: vi.fn(),
  })
);

import {
  extractDynamicFormFromText,
} from "../services/dynamicFormService";

import VoiceLog from "./VoiceLog";

const BASE_LOG = {
  id: "transcript-reanalysis-001",
  lot: "Lô A",
  work: "Bón phân",
  materials: [
    {
      material: "Phân NPK",
      quantity: 20,
      unit: "Kilôgam",
    },
  ],
  time: "08:30",
  date: "03/10/2026",
  transcript: "Hôm nay bón 20 kg phân NPK cho lô A lúc 08:30.",
  result_status: "completed",
  status: "completed",
};

beforeEach(() => {
  vi.clearAllMocks();

  extractDynamicFormFromText.mockResolvedValue({
    contract_version: "3.1",
    operation: "CREATE_WORK_LOG",
    fields: {
      plot_text: "Lô B",
      activity_text: "Bón phân",
      performed_time_text: "09:15",
      materials: [
        {
          material_text: "Phân NPK",
          quantity: 30,
          unit_text: "Kilôgam",
        },
      ],
      result_status: "completed",
      photo_required: null,
      material_batch_text: null,
      note: null,
    },
    missing_fields: [],
    warnings: [],
    field_confidence: {},
    requires_confirmation: false,
    next_question: null,
  });
});

describe(
  "VoiceLog manual transcript re-analysis",
  () => {
    it(
      "refreshes the visible form after a manually edited transcript is re-analyzed",
      async () => {
        render(
          <VoiceLog
            language="vi"
            logToEdit={BASE_LOG}
          />
        );

        await waitFor(() => {
          expect(
            screen.getByTestId("operation").textContent
          ).toBe("CREATE_WORK_LOG");
        });

        fireEvent.click(
          screen.getByTestId("edit-transcript")
        );

        await waitFor(() => {
          expect(
            screen.getByTestId("reanalyze-transcript")
          ).toBeTruthy();
        });

        fireEvent.click(
          screen.getByTestId("reanalyze-transcript")
        );

        await waitFor(() => {
          expect(
            extractDynamicFormFromText
          ).toHaveBeenCalledTimes(1);
        });

        expect(
          extractDynamicFormFromText
        ).toHaveBeenCalledWith({
          operation: "CREATE_WORK_LOG",
          transcript:
            "Hôm nay bón 30 kg phân NPK cho lô B lúc 09:15.",
          currentFields: {},
        });

        await waitFor(() => {
          const form = JSON.parse(
            screen.getByTestId("dynamic-form").textContent
          );

          expect(form.fields.plot_text).toBe("Lô B");
          expect(form.fields.performed_time_text).toBe("09:15");
          expect(form.fields.materials[0].quantity).toBe(30);
        });

        expect(
          screen.queryByTestId("reanalyze-transcript")
        ).toBeNull();
      }
    );
  }
);
