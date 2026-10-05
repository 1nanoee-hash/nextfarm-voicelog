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


vi.mock(
  "../components/Header",
  () => ({
    default: () => null,
  })
);

vi.mock(
  "../components/WorkflowStepper",
  () => ({
    default: () => null,
  })
);

vi.mock(
  "../components/RecordButton",
  () => ({
    default: () => null,
  })
);

vi.mock(
  "../components/HandsFreeWakeControl",
  () => ({
    default: () => null,
  })
);

vi.mock(
  "../components/TranscriptBox",
  () => ({
    default: ({ transcript }) => (
      <div data-testid="transcript">
        {transcript}
      </div>
    ),
  })
);

vi.mock(
  "../components/ActionButtons",
  () => ({
    default: ({
      onConfirm,
      validation,
    }) => (
      <button
        type="button"
        data-testid="confirm"
        data-has-errors={
          validation?.hasErrors
            ? "true"
            : "false"
        }
        onClick={onConfirm}
      >
        Xác nhận
      </button>
    ),
  })
);

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
    default: ({
      dynamicForm,
      onFieldsChange,
    }) => (
      <>
        <pre data-testid="dynamic-form">
          {JSON.stringify(
            dynamicForm
          )}
        </pre>

        <button
          type="button"
          data-testid="complete-edit"
          onClick={() => {
            const fields =
              dynamicForm?.fields || {};

            const materials =
              Array.isArray(
                fields.materials
              )
                ? fields.materials
                : [];

            onFieldsChange?.({
              ...fields,

              result_status:
                "completed",

              materials:
                materials.map(
                  (
                    item,
                    index
                  ) =>
                    index === 0
                      ? {
                          ...item,
                          quantity:
                            25,
                        }
                      : item
                ),
            });
          }}
        >
          Điền dữ liệu sửa
        </button>
      </>
    ),
  })
);

vi.mock(
  "../services/audioService",
  () => ({
    uploadAudio: vi.fn(),
  })
);

vi.mock(
  "../services/photoUploadService",
  () => ({
    uploadPhoto: vi.fn(),
  })
);

vi.mock(
  "../services/integrationService",
  () => ({
    resolveMasterData: vi.fn(),
    validateCultivationLog:
      vi.fn(),
    saveCultivationLog:
      vi.fn(),
    updateCultivationLog:
      vi.fn(),
    saveDynamicOperation:
      vi.fn(),
  })
);


import {
  resolveMasterData,
  updateCultivationLog,
  validateCultivationLog,
} from "../services/integrationService";

import VoiceLog from "./VoiceLog";


const BASE_LOG = {
  id:
    "a9a57015-bd78-4e76-a1f1-d39955813818",

  lot:
    "Lô A",

  work:
    "Bón phân",

  materials: [
    {
      material:
        "Phân NPK",

      quantity:
        20,

      unit:
        "Kilôgam",
    },
  ],

  time:
    "08:30",

  date:
    "03/10/2026",

  transcript:
    "Hôm nay, bón 20 kg phân NPK, cho lô A, lúc 8h 30 phút.",

  status:
    "completed",
};


beforeEach(() => {
  vi.clearAllMocks();
});


describe(
  "VoiceLog existing work log editing",
  () => {
    it(
      "restores saved values into the visible dynamic form",
      async () => {
        const onLogLoaded =
          vi.fn();

        render(
          <VoiceLog
            language="vi"
            logToEdit={{
              ...BASE_LOG,

              result_status:
                "completed",
            }}
            onLogLoaded={
              onLogLoaded
            }
          />
        );

        await waitFor(() => {
          expect(
            screen.getByTestId(
              "operation"
            ).textContent
          ).toBe(
            "CREATE_WORK_LOG"
          );

          const restoredForm =
            JSON.parse(
              screen.getByTestId(
                "dynamic-form"
              ).textContent
            );

          expect(
            restoredForm.fields
              .plot_text
          ).toBe(
            "Lô A"
          );

          expect(
            restoredForm.fields
              .activity_text
          ).toBe(
            "Bón phân"
          );

          expect(
            restoredForm.fields
              .performed_time_text
          ).toBe(
            "08:30"
          );

          expect(
            restoredForm.fields
              .materials
          ).toEqual([
            {
              material_text:
                "Phân NPK",

              quantity:
                20,

              unit_text:
                "Kilôgam",
            },
          ]);

          expect(
            restoredForm.fields
              .result_status
          ).toBe(
            "completed"
          );
        });

        expect(
          screen.getByTestId(
            "transcript"
          ).textContent
        ).toContain(
          "bón 20 kg phân NPK"
        );

        expect(
          screen.getByText(
            /Đang chỉnh sửa nhật ký đã hoàn thành của lô Lô A/
          )
        ).toBeTruthy();

        expect(
          onLogLoaded
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "blocks an existing log update while result_status is missing",
      async () => {
        render(
          <VoiceLog
            language="vi"
            logToEdit={{
              ...BASE_LOG,

              result_status:
                null,
            }}
          />
        );

        await waitFor(() => {
          expect(
            screen.getByTestId(
              "confirm"
            ).getAttribute(
              "data-has-errors"
            )
          ).toBe(
            "true"
          );
        });

        fireEvent.click(
          screen.getByTestId(
            "confirm"
          )
        );

        await waitFor(() => {
          expect(
            screen.getByText(
              /Chưa thể xác nhận nhật ký/
            )
          ).toBeTruthy();
        });

        expect(
          updateCultivationLog
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "updates the same log with visible material values and result_status",
      async () => {
        resolveMasterData
          .mockImplementation(
            async (type) => {
              const values = {
                lot: {
                  matched:
                    true,

                  code:
                    "LO_A",

                  name:
                    "Lô A",

                  requires_confirmation:
                    false,
                },

                activity: {
                  matched:
                    true,

                  code:
                    "BON_PHAN",

                  name:
                    "Bón phân",

                  requires_confirmation:
                    false,
                },

                material: {
                  matched:
                    true,

                  code:
                    "NPK",

                  name:
                    "Phân NPK",

                  requires_confirmation:
                    false,
                },

                unit: {
                  matched:
                    true,

                  code:
                    "KG",

                  name:
                    "Kilôgam",

                  requires_confirmation:
                    false,
                },
              };

              return values[type];
            }
          );

        validateCultivationLog
          .mockResolvedValue({
            is_valid:
              true,

            errors:
              [],

            warnings:
              [],

            requires_confirmation:
              false,
          });

        updateCultivationLog
          .mockResolvedValue({
            client_record_id:
              BASE_LOG.id,

            result_status:
              "completed",

            materials: [
              {
                material_code:
                  "NPK",

                quantity:
                  25,

                unit_code:
                  "KG",
              },
            ],
          });

        render(
          <VoiceLog
            language="vi"
            logToEdit={{
              ...BASE_LOG,

              result_status:
                null,
            }}
          />
        );

        await waitFor(() => {
          const restoredForm =
            JSON.parse(
              screen.getByTestId(
                "dynamic-form"
              ).textContent
            );

          expect(
            restoredForm.fields
              .materials[0]
              .material_text
          ).toBe(
            "Phân NPK"
          );

          expect(
            restoredForm.fields
              .materials[0]
              .unit_text
          ).toBe(
            "Kilôgam"
          );
        });

        fireEvent.click(
          screen.getByTestId(
            "complete-edit"
          )
        );

        await waitFor(() => {
          expect(
            screen.getByTestId(
              "confirm"
            ).getAttribute(
              "data-has-errors"
            )
          ).toBe(
            "false"
          );
        });

        fireEvent.click(
          screen.getByTestId(
            "confirm"
          )
        );

        await waitFor(() => {
          expect(
            updateCultivationLog
          ).toHaveBeenCalledTimes(
            1
          );
        });

        const [
          clientRecordId,
          contract,
        ] =
          updateCultivationLog
            .mock.calls[0];

        expect(
          clientRecordId
        ).toBe(
          BASE_LOG.id
        );

        expect(
          contract.result_status
        ).toBe(
          "completed"
        );

        expect(
          contract.materials
        ).toEqual([
          {
            material_code:
              "NPK",

            quantity:
              25,

            unit_code:
              "KG",
          },
        ]);
      }
    );
  }
);
