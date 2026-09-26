const INTEGRATION_BASE_URL =
  String(
    import.meta.env.VITE_INTEGRATION_API_URL ||
      "http://127.0.0.1:8002"
  ).replace(/\/+$/, "");


export async function uploadPhoto(file) {
  if (!(file instanceof File)) {
    throw new Error(
      "Vui lòng chọn một tệp ảnh hợp lệ."
    );
  }

  const formData = new FormData();
  formData.append(
    "file",
    file
  );

  const response = await fetch(
    `${INTEGRATION_BASE_URL}/api/uploads/images`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    const message =
      data?.detail?.message ||
      "Không thể tải ảnh lên.";

    throw new Error(
      message
    );
  }

  const photo = String(
    data?.photo || ""
  ).trim();

  if (!photo) {
    throw new Error(
      "Upload thành công nhưng server không trả về đường dẫn ảnh."
    );
  }

  return {
    photo,
    url:
      `${INTEGRATION_BASE_URL}${photo}`,
  };
}