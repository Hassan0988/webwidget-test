import { WebCallClient } from "webcall-sdk";

interface CallCallbacks {
  onCallStarted?: () => void;
  onCallEnded?: () => void;
  onAgentStartTalking?: () => void;
  onAgentStopTalking?: () => void;
  onUpdate?: (update: { transcript?: string }) => void;
  onError?: (error: Error) => void;
}

export class CallManager {
  private client: WebCallClient;
  private callbacks: CallCallbacks;

  constructor(
    private readonly accessToken: string,
    callbacks: CallCallbacks = {}
  ) {
    this.client = new WebCallClient();
    this.callbacks = callbacks;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Agent talking events
    this.client.on("agent_start_talking", () => {
      if (this.callbacks.onAgentStartTalking) {
        this.callbacks.onAgentStartTalking();
      }
    });

    this.client.on("agent_stop_talking", () => {
      if (this.callbacks.onAgentStopTalking) {
        this.callbacks.onAgentStopTalking();
      }
    });

    // Call updates
    this.client.on("update", (update: { transcript?: string }) => {
      if (this.callbacks.onUpdate) {
        this.callbacks.onUpdate(update);
      }
    });

    // Call ended
    this.client.on("call_ended", () => {
      if (this.callbacks.onCallEnded) {
        this.callbacks.onCallEnded();
      }
    });

    // Call started
    this.client.on("call_started", () => {
      if (this.callbacks.onCallStarted) {
        this.callbacks.onCallStarted();
      }
    });

    // Error handling
    this.client.on("error", (error: Error) => {
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      this.stop();
    });
  }

  public async start(): Promise<void> {
    try {
       await this.client.startCall({
        accessToken: this.accessToken,
      });
    } catch (error) {
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw error;
    }
  }

  public stop(): void {
    this.client.stopCall();
    this.cleanup();
  }

  private cleanup(): void {
    this.client.removeAllListeners();
  }
}
