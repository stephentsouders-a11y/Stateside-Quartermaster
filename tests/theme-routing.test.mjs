import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../shopify/snippets/${name}`, import.meta.url), 'utf8');

const tree = read('sq-bfl-unified-series-tree.liquid');
const armyFinal = read('sq-army-uniform-final-authority-v1.liquid');
const armyIntegrity = read('sq-army-uniform-integrity-hotfix.liquid');
const parity = read('sq-army-arng-visual-parity-v1.liquid');
const normalizer = read('sq-navigation-legacy-normalizer.liquid');
const stateGuardPt = read('sq-state-guard-pt-category-lock.liquid');

test('Fire/EMS admits strong medical products before generic relevance rejection', () => {
  assert.match(tree, /cfg\.mode==='fire'&&publicSafetyMedical\(p\)\)return true/);
  assert.match(tree, /if\(publicSafetyMedical\(p\)\)out\.push\('EMS & Medical'\)/);
});

test('medical identification patches are excluded from medical gear routing', () => {
  assert.match(tree, /SQ Verified Equipment Identification Patch/);
  assert.match(tree, /blood type & medical id patches/);
  assert.match(tree, /medical identification/);
});

test('Public Safety medical classification wins before generic duty gear', () => {
  const medical = tree.indexOf("return'Medical & First Aid'");
  const duty = tree.indexOf("return'Duty / Rescue Gear & Equipment'");
  assert.ok(medical >= 0, 'medical route missing');
  assert.ok(duty >= 0, 'duty route missing');
  assert.ok(medical < duty, 'generic duty gear must not steal medical products');
});

test('Army cold-weather final authority is narrow and exact', () => {
  assert.match(armyFinal, /products-built-for-the-line-u-s-army/);
  assert.match(armyFinal, /army-national-guard-series/);
  assert.match(armyFinal, /pt==='cold weather & ecwcs'/);
  assert.match(armyFinal, /SQ Army Uniform System: Cold Weather/);
  assert.match(armyFinal, /return'Uniforms & Uniform Accessories'/);
  assert.match(armyFinal, /return'Cold Weather & Outerwear'/);
});

test('Combat Shirts remain in Army OCP', () => {
  assert.match(armyIntegrity, /combat shirts\?/);
  assert.match(armyIntegrity, /return'OCP \/ Combat & Field Uniform'/);
});

test('Army and ARNG approved root imagery remains locked', () => {
  assert.match(parity, /FRACU-ocp-uniform-jacket-new\.jpg/);
  assert.match(parity, /sq-state-guard-male-agsu-marlow-white\.jpg/);
  assert.match(parity, /sq-state-guard-male-asu-marlow-white\.jpg/);
  assert.match(parity, /Marlow White U\.S\. Army Green Service Uniform/);
  assert.match(parity, /Marlow White U\.S\. Army Blue Service Uniform/);
});

test('late render order preserves final Army authority and visual locks', () => {
  const shared = normalizer.indexOf("render 'sq-bfl-unified-series-tree'");
  const headToToe = normalizer.indexOf("render 'sq-army-uniform-shop-head-to-toe-v2'");
  const finalAuthority = normalizer.indexOf("render 'sq-army-uniform-final-authority-v1'");
  const visual = normalizer.indexOf("render 'sq-army-arng-visual-parity-v1'");
  assert.ok(shared >= 0 && headToToe > shared && finalAuthority > headToToe && visual > finalAuthority);
});

test('State Guard PT footwear is isolated to the approved black M-Tac shoe', () => {
  assert.match(stateGuardPt, /SHOE='m-tac-carbon-performance-sneakers'/);
  assert.match(stateGuardPt, /stockedBlack/);
  assert.match(stateGuardPt, /if\(baseHandle\(card\)!==SHOE\)removeCard\(card\)/);
  assert.match(stateGuardPt, /M-Tac Carbon Performance Sneakers - Black/);
});

test('State Guard Cold Weather PT rejects footwear, belts, hi-vis and G-Shock leakage', () => {
  assert.match(stateGuardPt, /NOT_COLD/);
  assert.match(stateGuardPt, /state-guard-hi-vis-vest/);
  assert.match(stateGuardPt, /reflective-pt-belt-random-color/);
  assert.match(stateGuardPt, /g-shock/);
  assert.match(stateGuardPt, /cold weather pt/);
});
