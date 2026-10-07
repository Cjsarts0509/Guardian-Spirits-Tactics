import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { LagTrace } from '../scripts/server-lag-trace.js';

describe('지연 원인 계측의 양성 대조', () => {
  it('CPU를 쓰는 동기 작업을 해당 구간과 연결한다', async () => {
    const trace = new LagTrace();
    try {
      trace.start();
      await new Promise((r) => setTimeout(r, 20));
      trace.measure('control.busy', () => {
        const until = performance.now() + 80, beginCpu = process.cpuUsage();
        while (true) {
          const used = process.cpuUsage(beginCpu);
          if (performance.now() >= until && used.user + used.system >= 20_000) break;
        }
      });
      await new Promise((r) => setTimeout(r, 20));
      const result = await trace.finish();
      const span = result.spans.find((s) => s.name === 'control.busy')!;
      expect(span.wallMs).toBeGreaterThanOrEqual(75);
      expect(span.cpuMs).toBeGreaterThan(10);
      expect(result.gaps.some((g) => g.overlappingSpans.some((s) => s.name === 'control.busy'))).toBe(true);
    } finally { trace.stop(); }
  });

  it('CPU를 쓰지 않는 동기 대기를 누락하지 않는다', async () => {
    const trace = new LagTrace();
    try {
      trace.start();
      await new Promise((r) => setTimeout(r, 20));
      trace.measure('control.sleep', () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 80));
      await new Promise((r) => setTimeout(r, 20));
      const result = await trace.finish();
      const span = result.spans.find((s) => s.name === 'control.sleep')!;
      expect(span.wallMs).toBeGreaterThanOrEqual(75);
      expect(span.cpuMs).toBeLessThan(span.wallMs / 2);
      expect(result.gaps.some((g) => g.overlappingSpans.some((s) => s.name === 'control.sleep'))).toBe(true);
    } finally { trace.stop(); }
  });
});
