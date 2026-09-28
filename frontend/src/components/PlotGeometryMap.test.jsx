// @vitest-environment jsdom

import {
  useState,
} from "react";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";


const leafletMock =
  vi.hoisted(() => ({
    handlers: {},
  }));


afterEach(() => {
  cleanup();
});


vi.mock(
  "react-leaflet",
  () => ({
    MapContainer({
      children,
    }) {
      return (
        <div data-testid="map">
          {children}
        </div>
      );
    },

    TileLayer() {
      return null;
    },

    CircleMarker({
      center,
    }) {
      return (
        <div
          data-testid="map-point"
          data-center={JSON.stringify(
            center
          )}
        />
      );
    },

    Polygon({
      positions,
    }) {
      return (
        <div
          data-testid="map-polygon"
          data-positions={JSON.stringify(
            positions
          )}
        />
      );
    },

    useMap() {
      return {
        setView: vi.fn(),
        getZoom: vi.fn(
          () => 16
        ),
      };
    },

    useMapEvents(
      handlers
    ) {
      leafletMock.handlers =
        handlers;

      return null;
    },
  })
);


import PlotGeometryMap from "./PlotGeometryMap";


function GeometryHarness({
  initialGeometry = null,
  onGeometryChange,
  language = "vi",
}) {
  const [
    geometry,
    setGeometry,
  ] = useState(
    initialGeometry
  );

  const handleChange = (
    nextGeometry
  ) => {
    setGeometry(
      nextGeometry
    );

    onGeometryChange?.(
      nextGeometry
    );
  };

  return (
    <PlotGeometryMap
      geometry={geometry}
      onChange={
        handleChange
      }
      language={
        language
      }
    />
  );
}


function clickMap(
  longitude,
  latitude
) {
  act(() => {
    leafletMock.handlers.click({
      latlng: {
        lng: longitude,
        lat: latitude,
      },
    });
  });
}


describe(
  "PlotGeometryMap",
  () => {
    beforeEach(() => {
      leafletMock.handlers =
        {};
    });


    it(
      "reads an existing closed Polygon and does not count the closing point twice",
      () => {
        const geometry = {
          type: "Polygon",
          coordinates: [
            [
              [
                105.97,
                20.25,
              ],
              [
                105.971,
                20.25,
              ],
              [
                105.971,
                20.251,
              ],
              [
                105.97,
                20.25,
              ],
            ],
          ],
        };

        render(
          <PlotGeometryMap
            geometry={
              geometry
            }
          />
        );

        expect(
          screen.getByText(
            "3 điểm đã chọn"
          )
        ).toBeTruthy();

        expect(
          screen.getAllByTestId(
            "map-point"
          )
        ).toHaveLength(
          3
        );

        const polygon =
          screen.getByTestId(
            "map-polygon"
          );

        expect(
          JSON.parse(
            polygon.getAttribute(
              "data-positions"
            )
          )
        ).toEqual([
          [
            20.25,
            105.97,
          ],
          [
            20.25,
            105.971,
          ],
          [
            20.251,
            105.971,
          ],
        ]);
      }
    );


    it(
      "keeps one and two points as local draft without emitting invalid geometry",
      () => {
        const onGeometryChange =
          vi.fn();

        render(
          <GeometryHarness
            onGeometryChange={
              onGeometryChange
            }
            language="en"
          />
        );

        clickMap(
          105.97,
          20.25
        );

        expect(
          onGeometryChange
        ).not.toHaveBeenCalled();

        expect(
          screen.getByText(
            "1 points selected"
          )
        ).toBeTruthy();

        clickMap(
          105.971,
          20.25
        );

        expect(
          onGeometryChange
        ).not.toHaveBeenCalled();

        expect(
          screen.getByText(
            "2 points selected"
          )
        ).toBeTruthy();

        expect(
          screen.getAllByTestId(
            "map-point"
          )
        ).toHaveLength(
          2
        );

        expect(
          screen.queryByTestId(
            "map-polygon"
          )
        ).toBeNull();
      }
    );


    it(
      "creates and automatically closes a Polygon after three map clicks",
      () => {
        const onGeometryChange =
          vi.fn();

        render(
          <GeometryHarness
            onGeometryChange={
              onGeometryChange
            }
          />
        );

        clickMap(
          105.97,
          20.25
        );

        clickMap(
          105.971,
          20.25
        );

        clickMap(
          105.971,
          20.251
        );

        expect(
          onGeometryChange
        ).toHaveBeenLastCalledWith({
          type: "Polygon",
          coordinates: [
            [
              [
                105.97,
                20.25,
              ],
              [
                105.971,
                20.25,
              ],
              [
                105.971,
                20.251,
              ],
              [
                105.97,
                20.25,
              ],
            ],
          ],
        });

        expect(
          screen.getByText(
            "3 điểm đã chọn"
          )
        ).toBeTruthy();

        expect(
          screen.getByTestId(
            "map-polygon"
          )
        ).toBeTruthy();
      }
    );


    it(
      "undo from three points clears valid geometry but keeps two draft points",
      () => {
        const onGeometryChange =
          vi.fn();

        const geometry = {
          type: "Polygon",
          coordinates: [
            [
              [
                105.97,
                20.25,
              ],
              [
                105.971,
                20.25,
              ],
              [
                105.971,
                20.251,
              ],
              [
                105.97,
                20.25,
              ],
            ],
          ],
        };

        render(
          <GeometryHarness
            initialGeometry={
              geometry
            }
            onGeometryChange={
              onGeometryChange
            }
            language="en"
          />
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                "Undo point",
            }
          )
        );

        expect(
          onGeometryChange
        ).toHaveBeenLastCalledWith(
          null
        );

        expect(
          screen.getByText(
            "2 points selected"
          )
        ).toBeTruthy();

        expect(
          screen.getAllByTestId(
            "map-point"
          )
        ).toHaveLength(
          2
        );

        expect(
          screen.queryByTestId(
            "map-polygon"
          )
        ).toBeNull();
      }
    );


    it(
      "clear removes the geometry",
      () => {
        const onGeometryChange =
          vi.fn();

        const geometry = {
          type: "Polygon",
          coordinates: [
            [
              [
                105.97,
                20.25,
              ],
              [
                105.971,
                20.25,
              ],
              [
                105.971,
                20.251,
              ],
              [
                105.97,
                20.25,
              ],
            ],
          ],
        };

        render(
          <GeometryHarness
            initialGeometry={
              geometry
            }
            onGeometryChange={
              onGeometryChange
            }
          />
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                "Xóa ranh giới",
            }
          )
        );

        expect(
          onGeometryChange
        ).toHaveBeenLastCalledWith(
          null
        );

        expect(
          screen.getByText(
            "0 điểm đã chọn"
          )
        ).toBeTruthy();

        expect(
          screen.queryByTestId(
            "map-polygon"
          )
        ).toBeNull();
      }
    );
  }
);