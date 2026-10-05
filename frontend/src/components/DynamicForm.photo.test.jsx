// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";


vi.mock(
  "./PlotGeometryMap",
  () => ({
    default: () => null,
  })
);


import DynamicForm from "./DynamicForm";


afterEach(() => {
  cleanup();
});


describe(
  "DynamicForm photo-required helper",
  () => {
    it(
      "describes the working photo upload flow instead of the obsolete Contract V3.1 warning",
      () => {
        render(
          <DynamicForm
            operation="CREATE_ISSUE_REPORT"
            language="vi"
            dynamicForm={{
              contract_version:
                "3.1",

              operation:
                "CREATE_ISSUE_REPORT",

              fields: {
                plot_text:
                  "Lô A",

                issue_type_text:
                  "Bệnh",

                severity_text:
                  "Trung bình",

                description:
                  "Đốm lá",

                photo_required:
                  true,

                note:
                  null,
              },

              missing_fields:
                [],

              warnings:
                [],

              field_confidence:
                {},

              requires_confirmation:
                false,

              next_question:
                null,
            }}
          />
        );

        expect(
          screen.getByText(
            /Hãy chọn ảnh tại mục “Ảnh minh chứng”/
          )
        ).toBeTruthy();

        expect(
          screen.queryByText(
            /Contract V3\.1 hiện chưa định nghĩa/
          )
        ).toBeNull();
      }
    );
  }
);
