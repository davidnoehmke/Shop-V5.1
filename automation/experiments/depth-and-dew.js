const root = document.documentElement;
const dewLayer = document.getElementById("dewLayer");

let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setTarget(clientX, clientY) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  targetX = clamp((clientX - centerX) / centerX, -1, 1);
  targetY = clamp((clientY - centerY) / centerY, -1, 1);
}

function animateDepth() {
  if (!reduceMotion) {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    root.style.setProperty("--depth-shift-x", `${currentX * 26}px`);
    root.style.setProperty("--depth-shift-y", `${currentY * 26}px`);

    root.style.setProperty("--mx", `${currentX * 24}`);
    root.style.setProperty("--my", `${currentY * 24}`);

    root.style.setProperty("--rx", `${currentX * 8}deg`);
    root.style.setProperty("--ry", `${currentY * 8}deg`);
  }

  requestAnimationFrame(animateDepth);
}

window.addEventListener("mousemove", (event) => {
  setTarget(event.clientX, event.clientY);
});

window.addEventListener(
  "touchmove",
  (event) => {
    if (!event.touches || !event.touches.length) return;
    setTarget(event.touches[0].clientX, event.touches[0].clientY);
  },
  { passive: true }
);

window.addEventListener("touchend", () => {
  targetX = 0;
  targetY = 0;
});

function createDew() {
  if (!dewLayer || reduceMotion) return;

  const total = window.innerWidth < 700 ? 36 : 72;

  for (let i = 0; i < total; i++) {
    const dew = document.createElement("span");
    dew.className = "dew";

    const left = Math.random() * 100;
    const duration = 7 + Math.random() * 9;
    const delay = Math.random() * 12;
    const height = 8 + Math.random() * 18;
    const width = 1 + Math.random() * 1.5;
    const opacity = 0.18 + Math.random() * 0.42;
    const drift = -12 + Math.random() * 24;

    dew.style.left = `${left}%`;
    dew.style.height = `${height}px`;
    dew.style.width = `${width}px`;
    dew.style.opacity = opacity;
    dew.style.animationDuration = `${duration}s`;
    dew.style.animationDelay = `${delay}s`;
    dew.style.marginLeft = `${drift}px`;

    dewLayer.appendChild(dew);
  }
}

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
});

createDew();
animateDepth();