import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CI/CD Pipeline Specification (Architecture §16, TASK [P24-T1])', () => {
  const ciWorkflowPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');

  it('ci.yml file exists in .github/workflows directory', () => {
    expect(fs.existsSync(ciWorkflowPath)).toBe(true);
  });

  it('contains triggers for push and pull_request on main branch', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');
    expect(content).toMatch(/on:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]/);
    expect(content).toMatch(/pull_request:\s*\n\s*branches:\s*\[main\]/);
  });

  it('defines the 3 sequential jobs: lint-and-typecheck, test-unit-integration, and build-matrix', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');
    expect(content).toContain('lint-and-typecheck:');
    expect(content).toContain('test-unit-integration:');
    expect(content).toContain('build-matrix:');

    // test-unit-integration needs lint-and-typecheck
    expect(content).toMatch(/test-unit-integration:[\s\S]*?needs:\s*lint-and-typecheck/);

    // build-matrix needs test-unit-integration
    expect(content).toMatch(/build-matrix:[\s\S]*?needs:\s*test-unit-integration/);
  });

  it('configures lint-and-typecheck with npm run lint and npm run typecheck', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');
    expect(content).toContain('npm run lint');
    expect(content).toContain('npm run typecheck');
  });

  it('configures test-unit-integration with unit and integration tests', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');
    expect(content).toContain('npm run test:unit');
    expect(content).toContain('npm run test:integration');
  });

  it('configures build-matrix with windows-latest, macos-latest, ubuntu-latest, rebuild, and package', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');
    expect(content).toContain('windows-latest');
    expect(content).toContain('macos-latest');
    expect(content).toContain('ubuntu-latest');
    expect(content).toContain('fail-fast: false');
    expect(content).toContain('npx @electron/rebuild');
    expect(content).toContain('npm run package');
  });

  it('uses Node.js 22 with npm cache across jobs', () => {
    const content = fs.readFileSync(ciWorkflowPath, 'utf-8');
    expect(content).toContain('node-version: 22');
    expect(content).toContain("cache: 'npm'");
  });
});
