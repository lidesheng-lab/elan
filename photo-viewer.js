const scale = 2.25;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const frameSelector = ".photo-frame";

function pointInImage(frame, event) {
  const image = frame.querySelector(".runway-photo:not(.photo-loading)");
  if (!image?.naturalWidth) return null;
  const box = frame.getBoundingClientRect();
  const fit = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
  const width = image.naturalWidth * fit;
  const height = image.naturalHeight * fit;
  const x = event.clientX - box.left;
  const y = event.clientY - box.top;
  if (Math.abs(x - box.width / 2) > width / 2 || Math.abs(y - box.height / 2) > height / 2) return null;
  return { x: x / box.width * 100, y: y / box.height * 100 };
}

function zoomControl(dialog) {
  const button = document.createElement("button");
  button.className = "photo-zoom";
  button.type = "button";
  dialog.append(button);
  let mode = "";
  let frame;
  let point = { x: 50, y: 50 };
  let touch;
  let lastTap;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");

  function paint(nextMode, nextPoint = { x: 50, y: 50 }) {
    mode = nextMode;
    point = nextPoint;
    if (frame) {
      frame.dataset.zoom = mode;
      frame.style.setProperty("--zoom-x", point.x + "%");
      frame.style.setProperty("--zoom-y", point.y + "%");
      frame.style.setProperty("--zoom-scale", mode ? scale : 1);
    }
    const locked = mode === "manual";
    const label = locked ? "还原" : "放大";
    if (button.textContent !== label) {
      button.textContent = label;
      button.setAttribute("aria-pressed", String(locked));
      button.setAttribute("aria-label", locked ? "还原全图" : "放大图片细节");
    }
  }

  function sync() {
    const nextFrame = dialog.querySelector(frameSelector);
    if (frame !== nextFrame || !dialog.open) {
      frame = nextFrame;
      touch = lastTap = undefined;
      paint("");
    }
    button.hidden = !dialog.open || !frame?.querySelector(".runway-photo:not(.photo-loading):not([hidden])")?.naturalWidth;
  }

  function toggle(at) {
    if (!button.hidden) paint(mode === "manual" ? "" : "manual", at);
  }

  button.addEventListener("click", () => toggle());
  dialog.addEventListener("load", sync, true);
  dialog.addEventListener("error", sync, true);
  dialog.addEventListener("pointerout", event => {
    if (mode === "hover" && frame?.contains(event.target) && !frame.contains(event.relatedTarget)) paint("");
  });
  dialog.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" && touch?.id === event.pointerId) {
      const dx = event.clientX - touch.x;
      const dy = event.clientY - touch.y;
      if (Math.hypot(dx, dy) < 9) return;
      touch.moved = true;
      if (mode !== "manual" || !frame) return;
      const { width, height } = frame.getBoundingClientRect();
      paint("manual", {
        x: clamp(touch.point.x - dx * 100 / (width * (scale - 1)), 0, 100),
        y: clamp(touch.point.y - dy * 100 / (height * (scale - 1)), 0, 100),
      });
    }
    if (event.pointerType !== "mouse" || mode === "manual" || motion.matches || !frame?.contains(event.target)) return;
    const at = pointInImage(frame, event);
    if (at) paint("hover", at);
    else if (mode === "hover") paint("");
  });
  dialog.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch" || !event.isPrimary || !frame?.contains(event.target)) return;
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY, point, time: performance.now() };
  });
  dialog.addEventListener("pointerup", event => {
    if (touch?.id !== event.pointerId) return;
    const gesture = touch;
    touch = undefined;
    const now = performance.now();
    const at = frame && pointInImage(frame, event);
    if (!at || gesture.moved || now - gesture.time > 290) {
      lastTap = undefined;
      return;
    }
    if (lastTap && now - lastTap.time < 360 && Math.hypot(lastTap.x - gesture.x, lastTap.y - gesture.y) < 25) {
      toggle(at);
      lastTap = undefined;
    } else lastTap = gesture;
  });
  dialog.addEventListener("pointercancel", () => { touch = lastTap = undefined; });
  dialog.addEventListener("keydown", event => {
    if (event.key.toLowerCase() === "z" && !button.hidden) {
      event.preventDefault();
      toggle();
    }
  });

  const observer = new MutationObserver(sync);
  observer.observe(dialog, { childList: true, subtree: true, attributes: true, attributeFilter: ["open","class"] });
  sync();
  return { reset: () => paint(""), sync };
}

export function enableMemberPhotoZoom(root) {
  function connect() {
    const dialog = root.querySelector(".photo-dialog");
    if (!dialog) return;
    observer.disconnect();
    zoomControl(dialog);
  }
  const observer = new MutationObserver(connect);
  observer.observe(root, { childList: true, subtree: true });
  connect();
}

let viewer;
function createViewer() {
  const dialog = document.createElement("dialog");
  dialog.className = "photo-dialog editorial-viewer";
  dialog.setAttribute("aria-label", "秀场大图");
  dialog.innerHTML = `<div class="photo-body">
    <button class="close" type="button" aria-label="关闭秀场大图">×</button>
    <div class="photo-frame"><img class="runway-photo" alt=""><p class="photo-unavailable" hidden>图片暂时无法载入。</p></div>
    <div class="photo-caption">
      <span class="photo-number" aria-live="polite"></span>
      <div class="photo-controls">
        <button type="button" aria-label="上一张">←</button>
        <button type="button" aria-label="下一张">→</button>
      </div>
    </div>
  </div>`;
  document.body.append(dialog);
  const image = dialog.querySelector("img");
  const problem = dialog.querySelector(".photo-unavailable");
  const count = dialog.querySelector(".photo-number");
  const [previous, next] = dialog.querySelectorAll(".photo-controls button");
  const zoom = zoomControl(dialog);
  let photos, index, opener;

  function paint() {
    const photo = photos[index];
    zoom.reset();
    problem.hidden = true;
    image.hidden = false;
    image.alt = photo.alt;
    image.src = photo.url;
    count.textContent = photos.length > 1 ? (index + 1) + " / " + photos.length : "";
    previous.parentElement.hidden = photos.length <= 1;
    previous.disabled = index === 0;
    next.disabled = index === photos.length - 1;
    zoom.sync();
  }

  function step(offset) {
    const position = clamp(index + offset, 0, photos.length - 1);
    if (position === index) return;
    index = position;
    paint();
  }

  image.addEventListener("error", () => { image.hidden = true; problem.hidden = false; zoom.sync(); });
  dialog.querySelector(".close").onclick = () => dialog.close();
  previous.onclick = () => step(-1);
  next.onclick = () => step(1);
  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  });
  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  return (images, position, trigger) => {
    photos = images;
    index = position;
    opener = trigger;
    paint();
    dialog.showModal();
  };
}

export function photoTrigger(image, photos, index) {
  const trigger = document.createElement("button");
  trigger.className = "editorial-photo-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "放大查看：" + image.alt);
  trigger.append(image);
  const mark = document.createElement("span");
  mark.className = "photo-trigger-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "+";
  trigger.append(mark);
  trigger.addEventListener("click", () => {
    viewer ??= createViewer();
    viewer(photos, index, trigger);
  });
  return trigger;
}
