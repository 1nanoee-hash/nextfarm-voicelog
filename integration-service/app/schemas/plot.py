from typing import Any, Literal

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)


class PlotGeometry(BaseModel):
    type: Literal["Polygon"] = "Polygon"

    coordinates: list[
        list[
            tuple[
                float,
                float,
            ]
        ]
    ]

    @field_validator(
        "coordinates"
    )
    @classmethod
    def validate_coordinates(
        cls,
        value: list[
            list[
                tuple[
                    float,
                    float,
                ]
            ]
        ],
    ) -> list[
        list[
            tuple[
                float,
                float,
            ]
        ]
    ]:
        if not value:
            raise ValueError(
                "Polygon phải có ít nhất một vòng tọa độ."
            )

        exterior_ring = value[0]

        if len(exterior_ring) < 4:
            raise ValueError(
                "Vòng ngoài của Polygon phải có ít nhất 4 điểm."
            )

        if (
            exterior_ring[0]
            != exterior_ring[-1]
        ):
            raise ValueError(
                "Polygon phải được đóng: điểm đầu và điểm cuối phải trùng nhau."
            )

        for ring in value:
            if len(ring) < 4:
                raise ValueError(
                    "Mỗi vòng của Polygon phải có ít nhất 4 điểm."
                )

            if (
                ring[0]
                != ring[-1]
            ):
                raise ValueError(
                    "Mỗi vòng Polygon phải được đóng."
                )

            for longitude, latitude in ring:
                if not (
                    -180
                    <= longitude
                    <= 180
                ):
                    raise ValueError(
                        "Kinh độ phải nằm trong khoảng -180 đến 180."
                    )

                if not (
                    -90
                    <= latitude
                    <= 90
                ):
                    raise ValueError(
                        "Vĩ độ phải nằm trong khoảng -90 đến 90."
                    )

        return value


class PlotCreateRequest(BaseModel):
    client_record_id: str = Field(
        min_length=1,
        max_length=100,
    )

    plot_name_or_code: str = Field(
        min_length=1,
        max_length=200,
    )

    region_text: str = Field(
        min_length=1,
        max_length=200,
    )

    boundary_required: bool

    geometry: PlotGeometry | None = None

    owner_text: str | None = None

    current_crop_text: str | None = None

    location_hint_text: str | None = None

    confirmed: bool = False

    @field_validator(
        "client_record_id",
        "plot_name_or_code",
        "region_text",
        mode="before",
    )
    @classmethod
    def strip_required_text(
        cls,
        value: object,
    ) -> object:
        if isinstance(value, str):
            return value.strip()

        return value

    @field_validator(
        "owner_text",
        "current_crop_text",
        "location_hint_text",
        mode="before",
    )
    @classmethod
    def strip_optional_text(
        cls,
        value: object,
    ) -> object:
        if isinstance(value, str):
            value = value.strip()

            if not value:
                return None

        return value


class PlotInput(BaseModel):
    client_record_id: str
    plot_name_or_code: str
    region_id: str
    boundary_required: bool

    geometry: PlotGeometry | None = None

    owner_text: str | None = None
    current_crop_id: str | None = None
    location_hint_text: str | None = None

    confirmed: bool = False


class PlotSaveResponse(BaseModel):
    success: bool

    status: Literal[
        "saved",
        "already_exists",
        "updated",
    ]

    data: dict[str, Any]


class PlotGetResponse(BaseModel):
    success: bool
    data: dict[str, Any]


class PlotListResponse(BaseModel):
    success: bool
    data: list[dict[str, Any]]