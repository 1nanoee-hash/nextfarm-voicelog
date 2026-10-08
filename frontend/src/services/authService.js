import {
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  auth,
  googleProvider,
  facebookProvider,
} from "../config/firebase";

const SESSION_KEY =
  "nextfarm-auth-session";

const USERS_KEY =
  "nextfarm-demo-users";

const PROFILE_OVERRIDES_KEY =
  "nextfarm-profile-overrides";


function readJson(
  key,
  fallback
) {
  try {
    const raw =
      localStorage.getItem(key);

    return raw
      ? JSON.parse(raw)
      : fallback;
  } catch {
    return fallback;
  }
}


function writeJson(
  key,
  value
) {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}


async function hashPassword(
  password
) {
  const data =
    new TextEncoder().encode(
      password
    );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array.from(
    new Uint8Array(digest)
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}


function createId() {
  return (
    crypto.randomUUID?.() ||
    `user-${Date.now()}`
  );
}


function getProfileKey(
  user
) {
  const provider =
    user?.provider ||
    "password";

  const identity =
    user?.id ||
    user?.email ||
    "unknown";

  return `${provider}:${identity}`;
}


function saveSession(
  user
) {
  const profileOverrides =
    readJson(
      PROFILE_OVERRIDES_KEY,
      {}
    );

  const override =
    profileOverrides[
      getProfileKey(user)
    ] || {};

  const session = {
    id: user.id,
    name:
      override.name ||
      user.name,
    email: user.email,
    provider:
      user.provider ||
      "password",
    photoURL:
      override.photoURL ||
      user.photoURL ||
      null,
  };

  writeJson(
    SESSION_KEY,
    session
  );

  return session;
}


export function getAuthSession() {
  return readJson(
    SESSION_KEY,
    null
  );
}


export function logoutDemo() {
  localStorage.removeItem(
    SESSION_KEY
  );

  signOut(auth).catch(() => {
    // Local session đã được xóa.
    // Firebase sign-out lỗi không được chặn logout UI.
  });
}


export async function registerDemo({
  name,
  email,
  password,
}) {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const users =
    readJson(
      USERS_KEY,
      []
    );

  const exists =
    users.some(
      (user) =>
        user.email ===
        normalizedEmail
    );

  if (exists) {
    throw new Error(
      "Email này đã được đăng ký."
    );
  }

  const passwordHash =
    await hashPassword(
      password
    );

  const user = {
    id: createId(),
    name:
      String(name || "")
        .trim(),
    email:
      normalizedEmail,
    passwordHash,
    provider:
      "password",
  };

  writeJson(
    USERS_KEY,
    [
      ...users,
      user,
    ]
  );

  return saveSession(user);
}


export async function loginDemo({
  email,
  password,
}) {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const users =
    readJson(
      USERS_KEY,
      []
    );

  const user =
    users.find(
      (item) =>
        item.email ===
        normalizedEmail
    );

  if (!user) {
    throw new Error(
      "Không tìm thấy tài khoản. Hãy đăng ký trước."
    );
  }

  const passwordHash =
    await hashPassword(
      password
    );

  if (
    user.passwordHash !==
    passwordHash
  ) {
    throw new Error(
      "Mật khẩu không chính xác."
    );
  }

  return saveSession(user);
}




export async function loginWithFacebook() {
  try {
    const result =
      await signInWithPopup(
        auth,
        facebookProvider
      );

    const firebaseUser =
      result.user;

    return saveSession({
      id:
        firebaseUser.uid,
      name:
        firebaseUser.displayName ||
        firebaseUser.email
          ?.split("@")[0] ||
        "Facebook User",
      email:
        firebaseUser.email ||
        "",
      provider:
        "facebook",
      photoURL:
        firebaseUser.photoURL ||
        null,
    });
  } catch (error) {
    const code =
      error?.code || "";

    if (
      code ===
      "auth/popup-closed-by-user"
    ) {
      throw new Error(
        "Bạn đã đóng cửa sổ đăng nhập Facebook.",
        { cause: error }
      );
    }

    if (
      code ===
      "auth/popup-blocked"
    ) {
      throw new Error(
        "Trình duyệt đã chặn cửa sổ đăng nhập Facebook. Hãy cho phép popup rồi thử lại.",
        { cause: error }
      );
    }

    if (
      code ===
      "auth/account-exists-with-different-credential"
    ) {
      throw new Error(
        "Email này đã được sử dụng với một phương thức đăng nhập khác. Hãy đăng nhập bằng phương thức đã dùng trước đó.",
        { cause: error }
      );
    }

    if (
      code ===
      "auth/unauthorized-domain"
    ) {
      throw new Error(
        "Tên miền hiện tại chưa được cho phép trong Firebase Authentication.",
        { cause: error }
      );
    }

    throw error;
  }
}


export async function loginWithGoogle() {
  try {
    const result =
      await signInWithPopup(
        auth,
        googleProvider
      );

    const firebaseUser =
      result.user;

    return saveSession({
      id:
        firebaseUser.uid,
      name:
        firebaseUser.displayName ||
        firebaseUser.email
          ?.split("@")[0] ||
        "Google User",
      email:
        firebaseUser.email ||
        "",
      provider:
        "google",
      photoURL:
        firebaseUser.photoURL ||
        null,
    });
  } catch (error) {
    const code =
      error?.code || "";

    if (
      code ===
      "auth/popup-closed-by-user"
    ) {
      throw new Error(
        "Bạn đã đóng cửa sổ đăng nhập Google.",
        { cause: error }
      );
    }

    if (
      code ===
      "auth/popup-blocked"
    ) {
      throw new Error(
        "Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép popup rồi thử lại.",
        { cause: error }
      );
    }

    if (
      code ===
      "auth/unauthorized-domain"
    ) {
      throw new Error(
        "Tên miền hiện tại chưa được cho phép trong Firebase Authentication.",
        { cause: error }
      );
    }

    if (
      code ===
      "auth/cancelled-popup-request"
    ) {
      throw new Error(
        "Yêu cầu đăng nhập Google trước đó đã bị hủy.",
        { cause: error }
      );
    }

    throw error;
  }
}


export function socialLoginDemo(
  provider
) {
  const providers = {
    google: {
      name:
        "Người dùng Google",
      email:
        "google.demo@nextfarm.local",
    },

    facebook: {
      name:
        "Người dùng Facebook",
      email:
        "facebook.demo@nextfarm.local",
    },

    microsoft: {
      name:
        "Người dùng Microsoft",
      email:
        "microsoft.demo@nextfarm.local",
    },
  };

  const profile =
    providers[provider];

  if (!profile) {
    throw new Error(
      "Nhà cung cấp đăng nhập không hợp lệ."
    );
  }

  return saveSession({
    id:
      `demo-${provider}`,
    ...profile,
    provider,
  });
}



export function updateProfileDemo({
  name,
  photoURL,
}) {
  const session =
    getAuthSession();

  if (!session) {
    throw new Error(
      "Kh\u00f4ng t\u00ecm th\u1ea5y phi\u00ean \u0111\u0103ng nh\u1eadp."
    );
  }

  const normalizedName =
    String(name || "")
      .trim();

  if (!normalizedName) {
    throw new Error(
      "H\u1ecd v\u00e0 t\u00ean kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng."
    );
  }

  const nextSession = {
    ...session,
    name: normalizedName,
    photoURL:
      photoURL !== undefined
        ? photoURL
        : session.photoURL,
  };

  writeJson(
    SESSION_KEY,
    nextSession
  );

  const profileOverrides =
    readJson(
      PROFILE_OVERRIDES_KEY,
      {}
    );

  profileOverrides[
    getProfileKey(session)
  ] = {
    name:
      nextSession.name,
    photoURL:
      nextSession.photoURL ||
      null,
  };

  writeJson(
    PROFILE_OVERRIDES_KEY,
    profileOverrides
  );

  const users =
    readJson(
      USERS_KEY,
      []
    );

  const userIndex =
    users.findIndex(
      (user) =>
        user.id ===
          session.id ||
        user.email ===
          session.email
    );

  if (userIndex >= 0) {
    const nextUsers = [
      ...users,
    ];

    nextUsers[userIndex] = {
      ...nextUsers[userIndex],
      name: normalizedName,
      photoURL:
        nextSession.photoURL ||
        null,
    };

    writeJson(
      USERS_KEY,
      nextUsers
    );
  }

  return nextSession;
}
