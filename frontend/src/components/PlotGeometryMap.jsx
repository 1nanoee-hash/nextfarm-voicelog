import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";


const DEFAULT_CENTER = [
  20.25,
  105.97,
];

const DEFAULT_ZOOM = 16;


function isSamePoint(
  first,
  second
) {
  return (
    Array.isArray(first) &&
    Array.isArray(second) &&
    first.length >= 2 &&
    second.length >= 2 &&
    first[0] === second[0] &&
    first[1] === second[1]
  );
}


function getGeometryPoints(
  geometry
) {
  const ring =
    geometry?.type ===
      "Polygon" &&
    Array.isArray(
      geometry?.coordinates?.[0]
    )
      ? geometry.coordinates[0]
      : [];

  if (ring.length === 0) {
    return [];
  }

  const points =
    ring.map(
      (point) => [
        Number(point[0]),
        Number(point[1]),
      ]
    );

  if (
    points.length > 1 &&
    isSamePoint(
      points[0],
      points[
        points.length - 1
      ]
    )
  ) {
    return points.slice(
      0,
      -1
    );
  }

  return points;
}


function buildGeometry(
  points
) {
  if (
    !Array.isArray(points) ||
    points.length < 3
  ) {
    return null;
  }

  const ring = [
    ...points,
    points[0],
  ];

  return {
    type: "Polygon",
    coordinates: [
      ring,
    ],
  };
}


function toLeafletPositions(
  points
) {
  return points.map(
    (point) => [
      point[1],
      point[0],
    ]
  );
}


function MapClickHandler({
  disabled,
  onAddPoint,
}) {
  useMapEvents({
    click(event) {
      if (disabled) {
        return;
      }

      onAddPoint?.([
        event.latlng.lng,
        event.latlng.lat,
      ]);
    },
  });

  return null;
}


function PlotGeometryMap({
  geometry = null,
  onChange,
  disabled = false,
  language = "vi",
}) {
  const isVietnamese =
    language === "vi";

  const points =
    getGeometryPoints(
      geometry
    );

  const leafletPositions =
    toLeafletPositions(
      points
    );

  const center =
    leafletPositions.length > 0
      ? leafletPositions[0]
      : DEFAULT_CENTER;

  const updatePoints = (
    nextPoints
  ) => {
    if (
      nextPoints.length >= 3
    ) {
      onChange?.(
        buildGeometry(
          nextPoints
        )
      );

      return;
    }

    onChange?.({
      type: "Polygon",
      coordinates: [
        nextPoints,
      ],
    });
  };

  const addPoint = (
    point
  ) => {
    updatePoints([
      ...points,
      point,
    ]);
  };

  const undoPoint = () => {
    if (
      disabled ||
      points.length === 0
    ) {
      return;
    }

    const nextPoints =
      points.slice(
        0,
        -1
      );

    if (
      nextPoints.length === 0
    ) {
      onChange?.(
        null
      );

      return;
    }

    updatePoints(
      nextPoints
    );
  };

  const clearPoints = () => {
    if (disabled) {
      return;
    }

    onChange?.(
      null
    );
  };

  return (
    <div className="plot-geometry-map">
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        style={{
          width: "100%",
          height: "360px",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          disabled={
            disabled
          }
          onAddPoint={
            addPoint
          }
        />

        {leafletPositions.map(
          (
            position,
            index
          ) => (
            <CircleMarker
              key={`${position[0]}-${position[1]}-${index}`}
              center={
                position
              }
              radius={6}
            />
          )
        )}

        {leafletPositions.length >=
          3 && (
          <Polygon
            positions={
              leafletPositions
            }
          />
        )}
      </MapContainer>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginTop: "10px",
        }}
      >
        <button
          type="button"
          onClick={
            undoPoint
          }
          disabled={
            disabled ||
            points.length === 0
          }
        >
          {isVietnamese
            ? "Hoàn tác điểm"
            : "Undo point"}
        </button>

        <button
          type="button"
          onClick={
            clearPoints
          }
          disabled={
            disabled ||
            points.length === 0
          }
        >
          {isVietnamese
            ? "Xóa ranh giới"
            : "Clear boundary"}
        </button>

        <span className="ai-hint">
          {isVietnamese
            ? `${points.length} điểm đã chọn`
            : `${points.length} points selected`}
        </span>
      </div>

      <p className="ai-hint">
        {isVietnamese
          ? "Nhấp lên bản đồ để thêm các điểm theo thứ tự. Từ 3 điểm trở lên, frontend sẽ tự đóng vòng và tạo GeoJSON Polygon."
          : "Click the map to add points in order. With 3 or more points, the frontend automatically closes the ring and creates a GeoJSON Polygon."}
      </p>
    </div>
  );
}


export default PlotGeometryMap;