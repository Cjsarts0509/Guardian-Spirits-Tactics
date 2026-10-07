import { decodeHostSnapshot, encodeHostFrame, serializeHostMemories, applyHostInputs, tickHost } from '@gst/rules';
import type { HostSnapshot, HostMemoryWire } from '@gst/rules';
import type { ClientMessage, ServerMessage, HostCommand, HostMember } from '@gst/protocol';

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<ServerMessage>) => void;
  postMessage(message: ClientMessage | { type: 'host.failed'; message: string }): void;
};
let snapshot: HostSnapshot;
let grant: Extract<ServerMessage, { type: 'host.grant' }>;
let members: HostMember[] = [], commands: HostCommand[] = [];
let frame = 0, awaiting = false, timer: ReturnType<typeof setInterval>;
let origin = 0, gameOrigin = 0, logBase = 0, recordBase = 0, sentLogCount = 0, sentRecordCount = 0;
let memories: HostMemoryWire, sentMemories: HostMemoryWire;
const now = () => Math.round(gameOrigin + (performance.now() - origin) * grant.timeScale);

function publish(): void {
  if (!snapshot || awaiting) return;
  try {
    const t = now();
    applyHostInputs(snapshot, commands, t);
    commands = commands.filter(c => c.id > snapshot.handled);
    tickHost(snapshot, members, t, grant);
    // 행동이 없는 틱도 시간·RNG·기억을 확정해 이탈 시 같은 상태로 이어간다.
    snapshot.state.now = Math.max(snapshot.state.now, t);
    const encoded = encodeHostFrame(snapshot, logBase, recordBase, memories, frame);
    const checkpoint = encoded.checkpoint; sentMemories = encoded.memories;
    sentLogCount = snapshot.state.log.length; sentRecordCount = snapshot.records.length;
    if (checkpoint.length > 8 * 1024 * 1024) throw Error('게임 상태가 호스팅 한도를 넘었습니다.');
    awaiting = true;
    scope.postMessage({ type: 'host.frame', epoch: grant.epoch, frame: ++frame, checkpoint });
  } catch (error) {
    clearInterval(timer);
    scope.postMessage({ type: 'host.failed', message: error instanceof Error ? error.message : String(error) });
  }
}

scope.onmessage = ({ data }) => {
  if (data.type === 'host.grant') {
    grant = data; frame = data.frame; members = data.members; commands = data.commands;
    snapshot = decodeHostSnapshot(data.checkpoint);
    snapshot.results = []; logBase = snapshot.state.log.length; recordBase = snapshot.records.length;
    memories = serializeHostMemories(snapshot.memories);
    origin = performance.now(); gameOrigin = snapshot.state.now; awaiting = false;
    clearInterval(timer); timer = setInterval(publish, data.tickMs);
    publish();
  } else if (grant && 'epoch' in data && data.epoch === grant.epoch) {
    if (data.type === 'host.members') members = data.members;
    if (data.type === 'host.command') commands.push(data.command);
    if (data.type === 'host.ack' && data.frame === frame) {
      snapshot.results = []; logBase = sentLogCount; recordBase = sentRecordCount; memories = sentMemories; awaiting = false;
    }
  }
};
