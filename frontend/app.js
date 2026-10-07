const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const ICONS = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  compress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
};

const state = {
  token: localStorage.getItem("token") || null,
  page: 1,
  limit: 12,
  total: 0,
  images: [],
  activeImage: null,
  authMode: "login",
  query: "",
  sort: "newest",
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
  afterPlaceholder: document.getElementById("afterPlaceholder"),
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
  brightness: document.getElementById("brightness"),
  brightnessValue: document.getElementById("brightnessValue"),
  contrast: document.getElementById("contrast"),
  contrastValue: document.getElementById("contrastValue"),
  saturation: document.getElementById("saturation"),
  saturationValue: document.getElementById("saturationValue"),
  blur: document.getElementById("blur"),
  blurValue: document.getElementById("blurValue"),
  flip: document.getElementById("flip"),
  mirror: document.getElementById("mirror"),
  grayscale: document.getElementById("grayscale"),
  sepia: document.getElementById("sepia"),
  invert: document.getElementById("invert"),
  sharpen: document.getElementById("sharpen"),
  format: document.getElementById("format"),
  quality: document.getElementById("quality"),
  qualityValue: document.getElementById("qualityValue"),
  applyTransform: document.getElementById("applyTransform"),
  transformError: document.getElementById("transformError"),
  beforeSize: document.getElementById("beforeSize"),
  afterSize: document.getElementById("afterSize"),
  toastContainer: document.getElementById("toastContainer"),
  usernameLabel: document.getElementById("usernameLabel"),
  galleryCount: document.getElementById("galleryCount"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  lightbox: document.getElementById("lightbox"),
  lightboxImg: document.getElementById("lightboxImg"),
  lightboxClose: document.getElementById("lightboxClose"),
};

function authHeaders() {
  return { Authorization: `Bearer ${state.token}` };
}

function errorDetail(err, fallback) {
  const detail = err && err.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail[0].msg.replace(/^Value error,\s*/, "");
  }
  return fallback;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function closeAllCustomSelects() {
  document.querySelectorAll(".custom-select-options").forEach((list) => list.classList.add("hidden"));
  document.querySelectorAll(".custom-select-trigger").forEach((btn) => btn.setAttribute("aria-expanded", "false"));
}

function enhanceSelect(selectEl) {
  const wrapper = selectEl.parentElement;
  selectEl.setAttribute("tabindex", "-1");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const label = document.createElement("span");
  trigger.appendChild(label);

  const chevron = document.createElement("span");
  chevron.className = "custom-select-chevron";
  chevron.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  trigger.appendChild(chevron);

  const listbox = document.createElement("ul");
  listbox.className = "custom-select-options hidden";
  listbox.setAttribute("role", "listbox");

  const optionEls = Array.from(selectEl.options).map((opt) => {
    const li = document.createElement("li");
    li.className = "custom-select-option";
    li.textContent = opt.textContent;
    li.dataset.value = opt.value;
    li.setAttribute("role", "option");
    li.addEventListener("click", () => {
      selectEl.value = opt.value;
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      closeAllCustomSelects();
    });
    listbox.appendChild(li);
    return li;
  });

  function syncLabel() {
    const selected = selectEl.options[selectEl.selectedIndex];
    label.textContent = selected ? selected.textContent : "";
    optionEls.forEach((li) => {
      const isSelected = li.dataset.value === selectEl.value;
      li.classList.toggle("selected", isSelected);
      li.setAttribute("aria-selected", String(isSelected));
    });
  }

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !listbox.classList.contains("hidden");
    closeAllCustomSelects();
    if (!isOpen) {
      listbox.classList.remove("hidden");
      trigger.setAttribute("aria-expanded", "true");
    }
  });

  selectEl.addEventListener("change", syncLabel);

  wrapper.appendChild(trigger);
  wrapper.appendChild(listbox);
  syncLabel();
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".custom-select")) closeAllCustomSelects();
});

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
      throw new Error(errorDetail(err, "Something went wrong"));
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
  if (event.dataTransfer.files.length) uploadFiles(event.dataTransfer.files);
});
els.fileInput.addEventListener("change", () => {
  if (els.fileInput.files.length) uploadFiles(els.fileInput.files);
});

function uploadSingleFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_UPLOAD_SIZE) {
      reject(new Error("too large (max 10 MB)"));
      return;
    }
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      reject(new Error("unsupported file type"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/images");
    xhr.setRequestHeader("Authorization", `Bearer ${state.token}`);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        els.uploadProgressBar.style.width = `${Math.round((event.loaded / event.total) * 100)}%`;
      }
    });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = "upload failed";
      try {
        message = JSON.parse(xhr.responseText).detail || message;
      } catch {
        if (xhr.status === 500) message = "server error (is storage configured?)";
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("could not reach the server"));
    xhr.send(formData);
  });
}

async function uploadFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;

  els.uploadError.classList.add("hidden");
  els.uploadProgress.classList.remove("hidden");

  const succeeded = [];
  const failed = [];

  for (const file of files) {
    els.uploadProgressBar.style.width = "0%";
    try {
      await uploadSingleFile(file);
      succeeded.push(file.name);
    } catch (err) {
      failed.push(`${file.name} — ${err.message}`);
    }
  }

  els.uploadProgress.classList.add("hidden");
  els.fileInput.value = "";

  if (succeeded.length) {
    state.page = 1;
    loadImages();
    const label = succeeded.length === 1 ? succeeded[0] : `${succeeded.length} images`;
    showToast(`Uploaded ${label}`, { type: "success" });
  }
  if (failed.length) {
    els.uploadError.textContent = failed.join("; ");
    els.uploadError.classList.remove("hidden");
  }
}

async function loadImages() {
  els.galleryGrid.innerHTML = '<p class="gallery-empty">Loading…</p>';
  const params = new URLSearchParams({ page: state.page, limit: state.limit, sort: state.sort });
  if (state.query) params.set("q", state.query);

  const response = await fetch(`/images?${params}`, { headers: authHeaders() });
  if (!response.ok) return;
  const data = await response.json();
  state.images = data.items;
  state.total = data.total;
  renderGallery();
}

let searchDebounce;
els.searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.query = els.searchInput.value.trim();
    state.page = 1;
    loadImages();
  }, 300);
});

els.sortSelect.addEventListener("change", () => {
  state.sort = els.sortSelect.value;
  state.page = 1;
  loadImages();
});

function iconButton(iconName, label, onClick, danger) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `card-icon-btn${danger ? " danger" : ""}`;
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.innerHTML = ICONS[iconName];
  btn.addEventListener("click", onClick);
  return btn;
}

function renderGallery() {
  els.galleryGrid.innerHTML = "";
  els.galleryCount.textContent = state.total === 1 ? "1 image" : `${state.total} images`;

  if (state.images.length === 0) {
    const empty = document.createElement("p");
    empty.className = "gallery-empty";
    empty.textContent = state.query
      ? `No images match "${state.query}".`
      : "No images yet — drag one into the box above to get started.";
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

    const badge = document.createElement("span");
    badge.className = "format-badge";
    badge.textContent = (image.content_type.split("/")[1] || "").replace("jpeg", "jpg");
    thumbWrap.appendChild(badge);

    const overlay = document.createElement("div");
    overlay.className = "card-overlay";
    overlay.appendChild(
      iconButton("eye", "Preview", (event) => {
        event.stopPropagation();
        openLightbox(img);
      })
    );
    overlay.appendChild(
      iconButton("download", "Download", (event) => {
        event.stopPropagation();
        if (img.src) triggerDownload(img.src, image.original_filename);
      })
    );
    overlay.appendChild(
      iconButton("compress", "Compress", (event) => {
        event.stopPropagation();
        compressImage(image);
      })
    );
    overlay.appendChild(
      iconButton(
        "trash",
        "Delete",
        (event) => {
          event.stopPropagation();
          deleteImage(image);
        },
        true
      )
    );
    thumbWrap.appendChild(overlay);

    const name = document.createElement("p");
    name.className = "gallery-filename";
    name.textContent = image.original_filename;

    const meta = document.createElement("p");
    meta.className = "gallery-meta";
    const dims = image.width && image.height ? `${image.width}×${image.height} · ` : "";
    meta.textContent = `${dims}${formatBytes(image.size)} · ${formatDate(image.created_at)}`;

    card.appendChild(thumbWrap);
    card.appendChild(name);
    card.appendChild(meta);
    card.addEventListener("click", () => openTransformModal(image));
    els.galleryGrid.appendChild(card);
  });

  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
  els.pageLabel.textContent = `Page ${state.page} of ${totalPages}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= totalPages;
}

function openLightbox(imgEl) {
  if (!imgEl.src) return;
  els.lightboxImg.src = imgEl.src;
  els.lightbox.classList.remove("hidden");
}

function closeLightbox() {
  els.lightbox.classList.add("hidden");
}

els.lightboxClose.addEventListener("click", closeLightbox);
els.lightbox.addEventListener("click", (event) => {
  if (event.target === els.lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!els.lightbox.classList.contains("hidden")) closeLightbox();
  else if (!els.transformModal.classList.contains("hidden")) els.transformModal.classList.add("hidden");
  else closeAllCustomSelects();
});

async function loadImageBlob(url, imgEl) {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) return null;
  const blob = await response.blob();
  imgEl.src = URL.createObjectURL(blob);
  await new Promise((resolve) => {
    imgEl.onload = resolve;
    imgEl.onerror = resolve;
  });
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
  const dims = image.width && image.height ? `${image.width}×${image.height} · ` : "";
  els.beforeSize.textContent = `${dims}${formatBytes(image.size)}`;
  els.afterSize.textContent = "";
  loadImageBlob(`/images/${image.id}`, els.beforeImg);
  els.afterImg.src = "";
  els.afterImg.classList.add("hidden");
  els.afterPlaceholder.classList.remove("hidden");
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
      throw new Error(errorDetail(err, "Compress failed"));
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
      throw new Error(errorDetail(err, "Delete failed"));
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
  els.brightness.value = 100;
  els.brightnessValue.textContent = "100%";
  els.contrast.value = 100;
  els.contrastValue.textContent = "100%";
  els.saturation.value = 100;
  els.saturationValue.textContent = "100%";
  els.blur.value = 0;
  els.blurValue.textContent = "0px";
  els.flip.checked = false;
  els.mirror.checked = false;
  els.grayscale.checked = false;
  els.sepia.checked = false;
  els.invert.checked = false;
  els.sharpen.checked = false;
  els.format.value = "";
  els.format.dispatchEvent(new Event("change"));
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
els.brightness.addEventListener("input", () => {
  els.brightnessValue.textContent = `${els.brightness.value}%`;
});
els.contrast.addEventListener("input", () => {
  els.contrastValue.textContent = `${els.contrast.value}%`;
});
els.saturation.addEventListener("input", () => {
  els.saturationValue.textContent = `${els.saturation.value}%`;
});
els.blur.addEventListener("input", () => {
  els.blurValue.textContent = `${els.blur.value}px`;
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
  if (Number(els.brightness.value) !== 100) payload.brightness = Number(els.brightness.value);
  if (Number(els.contrast.value) !== 100) payload.contrast = Number(els.contrast.value);
  if (Number(els.saturation.value) !== 100) payload.saturation = Number(els.saturation.value);
  if (Number(els.blur.value) > 0) payload.blur = Number(els.blur.value);
  if (els.flip.checked) payload.flip = true;
  if (els.mirror.checked) payload.mirror = true;
  if (els.grayscale.checked) payload.grayscale = true;
  if (els.sepia.checked) payload.sepia = true;
  if (els.invert.checked) payload.invert = true;
  if (els.sharpen.checked) payload.sharpen = true;
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
      throw new Error(errorDetail(err, "Transform failed"));
    }
    const data = await response.json();
    const afterBytes = await loadImageBlob(data.url, els.afterImg);
    els.afterPlaceholder.classList.add("hidden");
    els.afterImg.classList.remove("hidden");
    const ext = data.storage_key.split(".").pop();
    els.downloadAfter.dataset.filename = `transformed.${ext}`;
    els.downloadAfter.classList.remove("hidden");

    if (afterBytes != null) {
      const pct = Math.round((1 - afterBytes / state.activeImage.size) * 100);
      const change = pct >= 0 ? `-${pct}%` : `+${Math.abs(pct)}%`;
      const afterDims = els.afterImg.naturalWidth ? `${els.afterImg.naturalWidth}×${els.afterImg.naturalHeight} · ` : "";
      els.afterSize.textContent = `${afterDims}${formatBytes(afterBytes)} (${change})`;
    }
  } catch (err) {
    els.transformError.textContent = err.message;
    els.transformError.classList.remove("hidden");
  } finally {
    els.applyTransform.disabled = false;
    els.applyTransform.textContent = "Apply";
  }
});

enhanceSelect(els.sortSelect);
enhanceSelect(els.format);

if (state.token) {
  showAuthed(true);
  loadImages();
} else {
  showAuthed(false);
}
