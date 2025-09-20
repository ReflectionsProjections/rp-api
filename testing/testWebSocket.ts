const WS_TIMEOUT = 30 * 1000;

export default class TestWebSocket {
    private url: string;
    private ws: WebSocket | undefined = undefined;
    private received: string[] = [];
    private closePromise: Promise<number> | undefined = undefined;
    private resolveClosePromise: ((code: number) => void) | undefined =
        undefined;
    private rejectClosePromise: ((reason?: unknown) => void) | undefined =
        undefined;

    constructor(url: string) {
        this.url = url;
    }

    start() {
        return new Promise<void>((resolve, reject) => {
            if (this.ws) return;

            this.ws = new WebSocket(this.url);

            this.closePromise = new Promise((resolve, reject) => {
                this.resolveClosePromise = resolve;
                this.rejectClosePromise = reject;
            });

            const timeout = setTimeout(reject, WS_TIMEOUT);

            this.ws.onopen = () => {
                clearTimeout(timeout);
                resolve();
            };

            this.ws.onmessage = (event) => {
                this.received.push(event.data);
            };

            this.ws.onclose = (event) => {
                if (!this.resolveClosePromise) return;
                this.resolveClosePromise(event.code);
                this.resolveClosePromise = undefined;
                this.rejectClosePromise = undefined;
            };

            this.ws.onerror = (error) => {
                if (!this.rejectClosePromise) return;
                this.rejectClosePromise(error);
                this.resolveClosePromise = undefined;
                this.rejectClosePromise = undefined;
            };
        });
    }

    send(message: string) {
        if (!this.ws) throw new Error("Cannot send - websocket not open");
        this.ws.send(message);
    }

    async close() {
        if (!this.ws || !this.closePromise) return;
        this.ws.close();
        this.ws = undefined;

        const code = await this.closePromise;
        this.closePromise = undefined;
        this.resolveClosePromise = undefined;
        this.rejectClosePromise = undefined;

        return { code, received: this.received };
    }
}
