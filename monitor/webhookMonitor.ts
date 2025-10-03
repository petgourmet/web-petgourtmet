// Monitor simple para webhooks

class WebhookMonitor {
  private stats = {
    received: 0,
    processed: 0,
    errors: 0,
    lastProcessed: null as Date | null
  };

  recordReceived() {
    this.stats.received++;
  }

  recordProcessed() {
    this.stats.processed++;
    this.stats.lastProcessed = new Date();
  }

  recordError() {
    this.stats.errors++;
  }

  getStats() {
    return { ...this.stats };
  }

  reset() {
    this.stats = {
      received: 0,
      processed: 0,
      errors: 0,
      lastProcessed: null
    };
  }
}

const webhookMonitor = new WebhookMonitor();
export default webhookMonitor;