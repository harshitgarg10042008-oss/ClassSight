import assert from 'node:assert/strict';
import { features } from '../lib/features.ts';
import { plans } from '../lib/plans.ts';

const config = JSON.stringify({ plans, features });
const parsed = JSON.parse(config);
assert.equal(parsed.features.length, 20);
assert.equal(parsed.plans.length, 3);
assert.deepEqual(parsed.features.filter((feature) => feature.defaultPlan === 'essential').length, 6);
console.log('Owner config copy test passed: snapshot parses and contains the plan registry.');
