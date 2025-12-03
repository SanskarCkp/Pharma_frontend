// src/utils/logout.js

// named export
export const logout = () => {
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  } catch (e) {
    // ignore
  }
  // navigate to login page (hard redirect ensures full state reset)
  window.location.href = "/login";
};

// also provide a default export so both import styles work
export default logout;
