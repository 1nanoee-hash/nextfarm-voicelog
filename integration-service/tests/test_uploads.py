from pathlib import Path

from fastapi.testclient import TestClient

from app.routers.uploads import (
    IMAGE_UPLOAD_DIR,
    MAX_IMAGE_SIZE_BYTES,
)


def test_upload_image_success(
    client: TestClient,
) -> None:
    image_bytes = (
        b"\xff\xd8\xff\xe0"
        b"fake-jpeg-content"
    )

    response = client.post(
        "/api/uploads/images",
        files={
            "file": (
                "test.jpg",
                image_bytes,
                "image/jpeg",
            ),
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["success"] is True
    assert data["photo"].startswith(
        "/uploads/images/"
    )
    assert data["photo"].endswith(
        ".jpg"
    )

    stored_filename = Path(
        data["photo"]
    ).name

    stored_path = (
        IMAGE_UPLOAD_DIR
        / stored_filename
    )

    assert stored_path.exists()
    assert stored_path.read_bytes() == (
        image_bytes
    )

    stored_path.unlink()


def test_upload_image_rejects_unsupported_type(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/uploads/images",
        files={
            "file": (
                "test.txt",
                b"not-an-image",
                "text/plain",
            ),
        },
    )

    assert response.status_code == 415

    data = response.json()

    assert (
        data["detail"]["code"]
        == "UNSUPPORTED_IMAGE_TYPE"
    )


def test_upload_image_rejects_empty_file(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/uploads/images",
        files={
            "file": (
                "empty.jpg",
                b"",
                "image/jpeg",
            ),
        },
    )

    assert response.status_code == 400

    data = response.json()

    assert (
        data["detail"]["code"]
        == "EMPTY_IMAGE"
    )


def test_upload_image_rejects_file_over_10_mb(
    client: TestClient,
) -> None:
    oversized_content = (
        b"x"
        * (
            MAX_IMAGE_SIZE_BYTES
            + 1
        )
    )

    response = client.post(
        "/api/uploads/images",
        files={
            "file": (
                "too-large.jpg",
                oversized_content,
                "image/jpeg",
            ),
        },
    )

    assert response.status_code == 413

    data = response.json()

    assert (
        data["detail"]["code"]
        == "IMAGE_TOO_LARGE"
    )

def test_upload_directory_is_service_scoped() -> None:
    service_root = (
        Path(__file__)
        .resolve()
        .parents[1]
    )

    assert (
        IMAGE_UPLOAD_DIR
        == service_root
        / "uploads"
        / "images"
    )


def test_uploaded_image_is_served(
    client: TestClient,
) -> None:
    image_bytes = (
        b"\x89PNG\r\n\x1a\n"
        b"fake-png-content"
    )

    upload_response = client.post(
        "/api/uploads/images",
        files={
            "file": (
                "evidence.png",
                image_bytes,
                "image/png",
            ),
        },
    )

    assert upload_response.status_code == 201

    photo = upload_response.json()["photo"]

    stored_path = (
        IMAGE_UPLOAD_DIR
        / Path(photo).name
    )

    try:
        response = client.get(photo)

        assert response.status_code == 200
        assert response.content == image_bytes
    finally:
        stored_path.unlink(
            missing_ok=True
        )

