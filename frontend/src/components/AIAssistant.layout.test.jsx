// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
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

import AIAssistant from "./AIAssistant";


beforeEach(() => {
  Element.prototype.scrollIntoView =
    vi.fn();

  document.body.classList.remove(
    "ai-assistant-open"
  );
});


afterEach(() => {
  cleanup();

  document.body.classList.remove(
    "ai-assistant-open"
  );
});


describe(
  "AIAssistant layout state",
  () => {
    it(
      "adds and removes the desktop side-rail body class with the panel",
      async () => {
        const {
          container,
          unmount,
        } = render(
          <AIAssistant
            language="vi"
          />
        );

        const floatingButton =
          container.querySelector(
            ".ai-assistant-floating"
          );

        expect(
          floatingButton
        ).toBeTruthy();

        expect(
          document.body.classList.contains(
            "ai-assistant-open"
          )
        ).toBe(false);

        fireEvent.click(
          floatingButton
        );

        await waitFor(() => {
          expect(
            document.body.classList.contains(
              "ai-assistant-open"
            )
          ).toBe(true);
        });

        fireEvent.click(
          floatingButton
        );

        await waitFor(() => {
          expect(
            document.body.classList.contains(
              "ai-assistant-open"
            )
          ).toBe(false);
        });

        fireEvent.click(
          floatingButton
        );

        await waitFor(() => {
          expect(
            document.body.classList.contains(
              "ai-assistant-open"
            )
          ).toBe(true);
        });

        unmount();

        expect(
          document.body.classList.contains(
            "ai-assistant-open"
          )
        ).toBe(false);
      }
    );
  }
);
