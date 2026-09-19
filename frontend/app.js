const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getPreferredTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  const toggle = document.getElementById("themeToggle");
  if (toggle) toggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

applyTheme(getPreferredTheme());

const state = {
  token: localStorage.getItem("token") || null,
  page: 1,
  limit: 12,
  total: 0,
  images: [],
  activeImage: null,
  authMode: "login",
};

const els = {
  authView: document.getElementById("authView"),
  appView: document.getElementById("appView"),
  logoutBtn: document.getElementById("logoutBtn"),
  loginTab: document.getElementById("loginTab"),
  registerTab: document.getElementById("registerTab"),
  authForm: document.getElementById("authForm"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  authError: document.getElementById("authError"),
  authSubmit: document.getElementById("authSubmit"),
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("fileInput"),
  uploadProgress: document.getElementById("uploadProgress"),
  uploadProgressBar: document.getElementById("uploadProgressBar"),
  uploadError: document.getElementById("uploadError"),
  galleryGrid: document.getElementById("galleryGrid"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageLabel: document.getElementById("pageLabel"),
  transformModal: document.getElementById("transformModal"),
  closeModal: document.getElementById("closeModal"),
  beforeImg: document.getElementById("beforeImg"),
  afterImg: document.getElementById("afterImg"),
  downloadBefore: document.getElementById("downloadBefore"),
  downloadAfter: document.getElementById("downloadAfter"),
  deleteImageBtn: document.getElementById("deleteImageBtn"),
  resizeWidth: document.getElementById("resizeWidth"),
  resizeHeight: document.getElementById("resizeHeight"),
  cropX: document.getElementById("cropX"),
  cropY: document.getElementById("cropY"),
  cropWidth: document.getElementById("cropWidth"),
  cropHeight: document.getElementById("cropHeight"),
  rotate: document.getElementById("rotate"),
  rotateValue: document.getElementById("rotateValue"),
  flip: document.getElementById("flip"),
  mirror: document.getElementById("mirror"),
  grayscale: document.getElementById("grayscale"),
  sepia: document.getElementById("sepia"),
  format: document.getElementById("format"),
  quality: document.getElementById("quality"),
  qualityValue: document.getElementById("qualityValue"),
  applyTransform: document.getElementById("applyTransform"),
  transformError: document.getElementById("transformError"),
  beforeSize: document.getElementById("beforeSize"),
  afterSize: document.getElementById("afterSize"),
  toastContainer: document.getElementById("toastContainer"),
  themeToggle: document.getElementById("themeToggle"),
  usernameLabel: document.getElementById("usernameLabel"),
  galleryCount: document.getElementById("galleryCount"),
};

els.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

function authHeaders() {
  return { Authorization: `Bearer ${state.token}` };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function showToast(message, { type = "info", actionLabel, onAction, duration = 5000 } = {}) {
  const toast = document.createElement("div");
  toast.className = `toast${type !== "info" ? ` toast-${type}` : ""}`;

  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);

  if (actionLabel && onAction) {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener("click", () => {
      onAction();
      toast.remove();
    });
    toast.appendChild(actionBtn);
  }

  els.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function showAuthed(authed) {
  els.authView.classList.toggle("hidden", authed);
  els.appView.classList.toggle("hidden", !authed);
  els.logoutBtn.classList.toggle("hidden", !authed);
  els.usernameLabel.classList.toggle("hidden", !authed);
  if (authed) els.usernameLabel.textContent = localStorage.getItem("username") || "";
}

function setAuthMode(mode) {
  state.authMode = mode;
  els.loginTab.classList.toggle("active", mode === "login");
  els.registerTab.classList.toggle("active", mode === "register");
  els.authSubmit.textContent = mode === "login" ? "Log in" : "Register";
  els.authError.classList.add("hidden");
}

els.loginTab.addEventListener("click", () => setAuthMode("login"));
els.registerTab.addEventListener("click", () => setAuthMode("register"));

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.authError.classList.add("hidden");

  try {
    const response = await fetch(`/${state.authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: els.username.value, password: els.password.value }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Something went wrong");
    }
    const data = await response.json();
    state.token = data.access_token;
    localStorage.setItem("token", state.token);
    localStorage.setItem("username", els.username.value);
    els.authForm.reset();
    showAuthed(true);
    loadImages();
  } catch (err) {
    els.authError.textContent = err.message;
    els.authError.classList.remove("hidden");
  }
});

els.logoutBtn.addEventListener("click", () => {
  state.token = null;
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  showAuthed(false);
});

els.dropzone.addEventListener("click", () => els.fileInput.click());
els.dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  els.dropzone.classList.add("dragover");
});
els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("dragover"));
els.dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  els.dropzone.classList.remove("dragover");
  if (event.dataTransfer.files.length) uploadFile(event.dataTransfer.files[0]);
});
els.fileInput.addEventListener("change", () => {
  if (els.fileInput.files.length) uploadFile(els.fileInput.files[0]);
});

function uploadFile(file) {
  els.uploadError.classList.add("hidden");

  if (file.size > MAX_UPLOAD_SIZE) {
    els.uploadError.textContent = "File too large (max 10 MB)";
    els.uploadError.classList.remove("hidden");
    return;
  }
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    els.uploadError.textContent = "Unsupported file type — use JPEG, PNG, WEBP, or GIF";
    els.uploadError.classList.remove("hidden");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  els.uploadProgress.classList.remove("hidden");
  els.uploadProgressBar.style.width = "0%";

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/images");
  xhr.setRequestHeader("Authorization", `Bearer ${state.token}`);
  xhr.upload.addEventListener("progress", (event) => {
    if (event.lengthComputable) {
      els.uploadProgressBar.style.width = `${Math.round((event.loaded / event.total) * 100)}%`;
    }
  });
  xhr.onload = () => {
    els.uploadProgress.classList.add("hidden");
    els.fileInput.value = "";
    if (xhr.status >= 200 && xhr.status < 300) {
      state.page = 1;
      loadImages();
      showToast(`Uploaded ${file.name}`, { type: "success" });
      return;
    }
    let message = "Upload failed";
    try {
      message = JSON.parse(xhr.responseText).detail || message;
    } catch {
      if (xhr.status === 500) message = "Upload failed — the server hit an error (is storage configured?)";
    }
    els.uploadError.textContent = message;
    els.uploadError.classList.remove("hidden");
  };
  xhr.onerror = () => {
    els.uploadProgress.classList.add("hidden");
    els.uploadError.textContent = "Upload failed — could not reach the server";
    els.uploadError.classList.remove("hidden");
  };
  xhr.send(formData);
}

async function loadImages() {
  els.galleryGrid.innerHTML = '<p class="gallery-empty">Loading…</p>';
  const response = await fetch(`/images?page=${state.page}&limit=${state.limit}`, {
    headers: authHeaders(),
  });
  if (!response.ok) return;
  const data = await response.json();
  state.images = data.items;
  state.total = data.total;
  renderGallery();
}

function renderGallery() {
  els.galleryGrid.innerHTML = "";
  els.galleryCount.textContent = state.total === 1 ? "1 image" : `${state.total} images`;

  if (state.images.length === 0) {
    const empty = document.createElement("p");
    empty.className = "gallery-empty";
    empty.textContent = "No images yet — drag one into the box above to get started.";
    els.galleryGrid.appendChild(empty);
    els.pageLabel.textContent = "";
    els.prevPage.disabled = true;
    els.nextPage.disabled = true;
    return;
  }

  state.images.forEach((image) => {
    const card = document.createElement("div");
    card.className = "gallery-card";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "gallery-thumb-wrap";
    const img = document.createElement("img");
    img.className = "gallery-thumb";
    loadImageBlob(`/images/${image.id}`, img);
    thumbWrap.appendChild(img);

    const name = document.createElement("p");
    name.className = "gallery-filename";
    name.textContent = image.original_filename;

    const meta = document.createElement("p");
    meta.className = "gallery-meta";
    meta.textContent = `${formatBytes(image.size)} · ${formatDate(image.created_at)}`;

    const actions = document.createElement("div");
    actions.className = "gallery-card-actions";

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "btn-link";
    downloadBtn.textContent = "Download";
    downloadBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (img.src) triggerDownload(img.src, image.original_filename);
    });

    const compressBtn = document.createElement("button");
    compressBtn.type = "button";
    compressBtn.className = "btn-link";
    compressBtn.textContent = "Compress";
    compressBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      compressImage(image);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-link danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteImage(image);
    });

    actions.appendChild(downloadBtn);
    actions.appendChild(compressBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(thumbWrap);
    card.appendChild(name);
    card.appendChild(meta);
    card.appendChild(actions);
    card.addEventListener("click", () => openTransformModal(image));
    els.galleryGrid.appendChild(card);
  });

  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
  els.pageLabel.textContent = `Page ${state.page} of ${totalPages}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= totalPages;
}

async function loadImageBlob(url, imgEl) {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) return null;
  const blob = await response.blob();
  imgEl.src = URL.createObjectURL(blob);
  return blob.size;
}

els.prevPage.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    loadImages();
  }
});
els.nextPage.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
  if (state.page < totalPages) {
    state.page += 1;
    loadImages();
  }
});

function openTransformModal(image) {
  state.activeImage = image;
  els.transformModal.classList.remove("hidden");
  els.transformError.classList.add("hidden");
  els.beforeSize.textContent = formatBytes(image.size);
  els.afterSize.textContent = "";
  loadImageBlob(`/images/${image.id}`, els.beforeImg);
  els.afterImg.src = "";
  els.downloadAfter.classList.add("hidden");
  resetTransformControls();
}

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function compressImage(image) {
  try {
    const response = await fetch(`/images/${image.id}/transform`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ format: "webp", compress_quality: 70 }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Compress failed");
    }
    const data = await response.json();
    const tempImg = new Image();
    const afterBytes = await loadImageBlob(data.url, tempImg);
    if (afterBytes == null) throw new Error("Could not read compressed result");

    const pct = Math.round((1 - afterBytes / image.size) * 100);
    const change = pct >= 0 ? `${pct}% smaller` : `${Math.abs(pct)}% larger`;
    const downloadName = `compressed-${image.original_filename.replace(/\.[^.]+$/, "")}.webp`;

    showToast(`${image.original_filename}: ${formatBytes(image.size)} → ${formatBytes(afterBytes)} (${change})`, {
      type: "success",
      actionLabel: "Download",
      onAction: () => triggerDownload(tempImg.src, downloadName),
      duration: 8000,
    });
  } catch (err) {
    showToast(err.message, { type: "error" });
  }
}

els.downloadBefore.addEventListener("click", () => {
  if (state.activeImage) triggerDownload(els.beforeImg.src, state.activeImage.original_filename);
});

els.downloadAfter.addEventListener("click", () => {
  if (els.afterImg.src) triggerDownload(els.afterImg.src, els.downloadAfter.dataset.filename || "transformed");
});

async function deleteImage(image, onError) {
  if (!confirm("Delete this image and all its transforms? This cannot be undone.")) return;

  try {
    const response = await fetch(`/images/${image.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Delete failed");
    }
    if (state.activeImage && state.activeImage.id === image.id) {
      els.transformModal.classList.add("hidden");
    }
    loadImages();
    showToast(`Deleted ${image.original_filename}`, { type: "success" });
  } catch (err) {
    if (onError) onError(err.message);
    else showToast(err.message, { type: "error" });
  }
}

els.deleteImageBtn.addEventListener("click", () => {
  if (!state.activeImage) return;
  deleteImage(state.activeImage, (message) => {
    els.transformError.textContent = message;
    els.transformError.classList.remove("hidden");
  });
});

function resetTransformControls() {
  els.resizeWidth.value = "";
  els.resizeHeight.value = "";
  els.cropX.value = "";
  els.cropY.value = "";
  els.cropWidth.value = "";
  els.cropHeight.value = "";
  els.rotate.value = 0;
  els.rotateValue.textContent = "0°";
  els.flip.checked = false;
  els.mirror.checked = false;
  els.grayscale.checked = false;
  els.sepia.checked = false;
  els.format.value = "";
  els.quality.value = 90;
  els.qualityValue.textContent = "90";
}

els.closeModal.addEventListener("click", () => {
  els.transformModal.classList.add("hidden");
});

els.rotate.addEventListener("input", () => {
  els.rotateValue.textContent = `${els.rotate.value}°`;
});
els.quality.addEventListener("input", () => {
  els.qualityValue.textContent = els.quality.value;
});

function buildTransformPayload() {
  const payload = {};

  if (els.resizeWidth.value || els.resizeHeight.value) {
    payload.resize = {
      width: els.resizeWidth.value ? Number(els.resizeWidth.value) : null,
      height: els.resizeHeight.value ? Number(els.resizeHeight.value) : null,
    };
  }
  if (els.cropWidth.value && els.cropHeight.value) {
    payload.crop = {
      width: Number(els.cropWidth.value),
      height: Number(els.cropHeight.value),
      x: Number(els.cropX.value || 0),
      y: Number(els.cropY.value || 0),
    };
  }
  if (Number(els.rotate.value)) payload.rotate = Number(els.rotate.value);
  if (els.flip.checked) payload.flip = true;
  if (els.mirror.checked) payload.mirror = true;
  if (els.grayscale.checked) payload.grayscale = true;
  if (els.sepia.checked) payload.sepia = true;
  if (els.format.value) payload.format = els.format.value;
  payload.compress_quality = Number(els.quality.value);

  return payload;
}

els.applyTransform.addEventListener("click", async () => {
  els.transformError.classList.add("hidden");
  els.applyTransform.disabled = true;
  els.applyTransform.textContent = "Applying…";
  try {
    const response = await fetch(`/images/${state.activeImage.id}/transform`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(buildTransformPayload()),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Transform failed");
    }
    const data = await response.json();
    const afterBytes = await loadImageBlob(data.url, els.afterImg);
    const ext = data.storage_key.split(".").pop();
    els.downloadAfter.dataset.filename = `transformed.${ext}`;
    els.downloadAfter.classList.remove("hidden");

    if (afterBytes != null) {
      const pct = Math.round((1 - afterBytes / state.activeImage.size) * 100);
      const change = pct >= 0 ? `-${pct}%` : `+${Math.abs(pct)}%`;
      els.afterSize.textContent = `${formatBytes(afterBytes)} (${change})`;
    }
  } catch (err) {
    els.transformError.textContent = err.message;
    els.transformError.classList.remove("hidden");
  } finally {
    els.applyTransform.disabled = false;
    els.applyTransform.textContent = "Apply";
  }
});

if (state.token) {
  showAuthed(true);
  loadImages();
} else {
  showAuthed(false);
}
