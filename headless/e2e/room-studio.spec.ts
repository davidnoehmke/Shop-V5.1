import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {parseRoomPlanDocument} from '../app/components/roomStudioPlan';

test('existing six-zone 3D planner and measurable editor work together', async ({page}) => {
  const response = await page.goto('/raumplaner-3d');
  expect(response?.status()).toBe(200);
  await expect(page.locator('.leaf-room__zones button')).toHaveCount(6);
  await expect(page.locator('.leaf-room__stage canvas')).toBeAttached();
  const studio = page.locator('#room-studio-editor');
  await expect(studio).toBeVisible();
  await studio.getByRole('button', {name: '+ Pflanzgefäß'}).click();
  const item = studio.locator('svg g[data-room-item-id]').first();
  await expect(item).toHaveCount(1);
  const before = await item.getAttribute('transform');
  const bounds = await item.boundingBox();
  expect(bounds).toBeTruthy();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 35, bounds!.y + bounds!.height / 2 + 25, {steps: 5});
  await page.mouse.up();
  const after = await item.getAttribute('transform');
  expect(after).not.toBe(before);
  await studio.getByRole('button', {name: 'Rückgängig'}).click();
  await expect(item).toHaveAttribute('transform', before!);
  await studio.getByRole('button', {name: 'Wiederholen'}).click();
  await expect(item).toHaveAttribute('transform', after!);
  await studio.getByRole('slider', {name: /Drehung/}).focus();
  await studio.getByRole('slider', {name: /Drehung/}).press('ArrowRight');
  await expect(studio.getByText('15°', {exact: true})).toBeVisible();
  await studio.getByRole('button', {name: 'Duplizieren'}).click();
  await expect(studio.locator('svg g[data-room-item-id]')).toHaveCount(2);
});

test('JSON export can be reimported and malformed JSON is rejected', async ({page}) => {
  await page.goto('/raumplaner-3d');
  const studio = page.locator('#room-studio-editor');
  await studio.getByRole('button', {name: '+ Pflanzgefäß'}).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    studio.getByRole('button', {name: 'Plan als JSON speichern'}).click(),
  ]);
  const content = await readFile(await download.path());
  const json: unknown = JSON.parse(content.toString());
  const validatedPlan = parseRoomPlanDocument(json);
  expect(validatedPlan?.items).toHaveLength(1);
  if (!validatedPlan || validatedPlan.items.length !== 1) throw Error('Invalid exported room plan');
  await studio.getByRole('button', {name: 'Entfernen'}).click();
  const input = studio.locator('input[type="file"][accept="application/json,.json"]');
  await input.setInputFiles({name: 'room.json', mimeType: 'application/json', buffer: content});
  await expect(studio.getByText('Raumplan erfolgreich importiert.')).toBeVisible();
  await expect(studio.locator('svg g[data-room-item-id]')).toHaveCount(1);
  const malicious = {version: 1, plan: {...validatedPlan, items: [{...validatedPlan.items[0], mount: '__proto__'}]}};
  await input.setInputFiles({name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(malicious))});
  await expect(studio.getByText('Ungültige Raumplan-Datei.')).toBeVisible();
  await expect(studio.locator('svg g[data-room-item-id]')).toHaveCount(1);
});

test('touch dragging works without scrolling the SVG stage', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'real touch emulation only in mobile project');
  await page.goto('/raumplaner-3d');
  const studio = page.locator('#room-studio-editor');
  await studio.getByRole('button', {name: '+ Pflanzgefäß'}).click();
  const item = studio.locator('svg g[data-room-item-id]').first();
  const before = await item.getAttribute('transform');
  const bounds = await item.boundingBox();
  expect(bounds).toBeTruthy();
  const x = bounds!.x + bounds!.width / 2;
  const y = bounds!.y + bounds!.height / 2;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
  await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x + 35, y: y + 25}]});
  await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await expect(item).not.toHaveAttribute('transform', before!);
});
