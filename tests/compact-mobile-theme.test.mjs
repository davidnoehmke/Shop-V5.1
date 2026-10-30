import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../assets/leaf-compact-content.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../layout/theme.liquid", import.meta.url), "utf8");

test("compact stylesheet loads once after legacy typography", () => {
  const tag = "{{ 'leaf-compact-content.css' | asset_url | stylesheet_tag }}";
  assert.equal(layout.split(tag).length - 1, 1);
  const link = layout.indexOf(tag);
  assert.ok(link > layout.lastIndexOf("</style>", link));
  assert.ok(link < layout.indexOf("</head>"));
});

test("CSS is balanced and safely scoped to the storefront", () => {
  let level = 0;
  for (const char of css) {
    if (char === "{") level++;
    if (char === "}") level--;
    assert.ok(level >= 0, "closing brace without opening brace");
  }
  assert.equal(level, 0);
  assert.match(css, /#MainContent h1\s*\{/);
  assert.match(css, /#MainContent h2\s*\{/);
  assert.match(css, /#MainContent h3\s*\{/);
  assert.doesNotMatch(css, /display:\s*none|line-clamp|visibility:\s*hidden|font-size:\s*0\b/i);
});

test("headings are smaller on mobile while body information stays readable", () => {
  assert.match(css, /@media\s*\(max-width:\s*700px\)/);
  assert.match(css, /--leaf-heading-page:\s*clamp\(1\.42rem/);
  assert.match(css, /--leaf-heading-section:\s*clamp\(1\.18rem/);
  assert.match(css, /--leaf-heading-detail:\s*clamp\(1\.04rem/);
  assert.match(css, /font-size:\s*1rem;\s*line-height:\s*1\.55/);
});

test("information cards stay visible with smaller mobile imagery", () => {
  assert.match(css, /#MainContent \.home-guides__media/);
  assert.match(css, /#MainContent \.home-journey__media/);
  assert.match(css, /#MainContent \.category-grid__card/);
  assert.match(css, /#MainContent \.leafer-substrate__commerce/);
  assert.match(css, /height:\s*clamp\(150px,\s*34vw,\s*190px\)/);
});

test("minimum interactive target sizes and content are preserved", () => {
  assert.match(css, /#MainContent :is\(button,\s*\.button,\s*input,\s*select,\s*textarea\)/);
  assert.match(css, /min-height:\s*48px/);
  assert.ok(!css.includes("content: none"));
  assert.ok(!css.includes("opacity: 0"));
});
