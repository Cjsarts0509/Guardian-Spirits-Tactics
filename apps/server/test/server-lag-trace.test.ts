import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { LagTrace, readOsCounters } from '../scripts/server-lag-trace.js';

describe('VM의 OS 카운터 호환성', () => {
  it('cgroup v1에서도 메인 스레드 대기 정보는 보존한다', () => {
    const result = readOsCounters((path) => {
      if (path === '/proc/self/cgroup') return '2:cpu,cpuacct:/user.slice\n';
      if (path === '/proc/self/schedstat') return '123000000 45000000 10\n';
      throw new Error('missing');
    });
    expect(result).toMatchObject({ runNs: 123000000, waitNs: 45000000, throttledUs: null, throttleCount: null });
  });
  it('cgroup v2는 본인 그룹을 읽고 누락 필드를 0으로 만들지 않는다', () => {
    const paths: string[] = [];
    const result = readOsCounters((path) => {
      paths.push(path);
      if (path === '/proc/self/cgroup') return '0::/user.slice/session.scope\n';
      if (path === '/sys/fs/cgroup/user.slice/session.scope/cpu.stat') return 'nr_throttled 7\n';
      if (path === '/proc/self/schedstat') return '\n';
      throw new Error('wrong group');
    });
    expect(result).toMatchObject({ throttleCount: 7, throttledUs: null, runNs: null, waitNs: null });
    expect(paths).not.toContain('/sys/fs/cgroup/cpu.stat');
    expect(readOsCounters(() => 'invalid')).toMatchObject({ runNs: null, waitNs: null });
  });
});

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
