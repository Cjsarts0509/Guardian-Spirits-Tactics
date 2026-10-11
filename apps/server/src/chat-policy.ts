/** One limiter per connection/session, shared by lobby, room and battle channels. */
export class ChatPolicy {
  private sent: number[] = [];
  private mutedUntil = 0;
  accept(text: string, now = Date.now()): string | null {
    if (!text.trim() || Array.from(text).length > 50) return '채팅은 1~50자까지 입력할 수 있습니다.';
    if (now < this.mutedUntil) return `도배 방지: ${Math.ceil((this.mutedUntil-now)/1000)}초 후 다시 말할 수 있습니다.`;
    this.sent = this.sent.filter(t => now-t < 5000);
    this.sent.push(now);
    if (this.sent.length >= 10) { this.mutedUntil=now+20000; this.sent=[]; return '5초 안에 10회 발언하여 20초간 채팅이 제한됩니다.'; }
    return null;
  }
}
