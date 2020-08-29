export class History {
    private history: string[];
    private historyIndex: number;
    private previousTextDocumentPath: string;
    private historyLock: boolean;

    constructor() {
        this.history = [];
        this.historyIndex = 0;
        this.previousTextDocumentPath = "";
        this.historyLock = false;
    }

    public getHistory(): string[] {
        return this.history;
    }
    public getHistoryIndex(): number {
        return this.historyIndex;
    }
    public getPreviousTextDocPath(): string {
        return this.previousTextDocumentPath;
    }
    public setHistory(val: string[]) {
        this.history = val;
    }
    public getHistroyLock(): boolean {
        return this.historyLock;
    }
    public setHistoryIndex(val: number) {
        this.historyIndex = val;
    }
    public setPreviousTextDocPath(val: string) {
        this.previousTextDocumentPath = val;
    }
    public setHistoryLock(val: boolean) {
        this.historyLock = val;
    }

    public updateHistroy(val: string) {
        if (this.getHistoryIndex() !== this.getHistory().length - 1) {
            this.setHistory(this.getHistory().slice(0, this.getHistoryIndex() + 1));
        }
        let newHistory = this.getHistory();

        if (newHistory.includes(val)) {
            newHistory.indexOf(val);
            newHistory.splice(newHistory.indexOf(val), 1);
            newHistory.push(val);
        } else if (newHistory.length < 25) {
            newHistory.push(val);
            this.setHistory(newHistory);
            this.setHistoryIndex(this.getHistory().length - 1);
        } else {
            newHistory.shift();
            newHistory.push(val);
            this.setHistory(newHistory);
            this.setHistoryIndex(this.getHistory().length - 1);
        }
    }
    public clearHistory() {
        this.setHistory([]);
        this.setHistoryIndex(0);
        this.setPreviousTextDocPath("");
        this.setHistoryLock(false);
    }

    public lastPage() {
        if (this.getHistoryIndex() > 0) {
            this.setHistoryIndex(this.getHistoryIndex() - 1)
            return this.getHistory()[this.getHistoryIndex()];
        }
    }
    public nextPage() {
        if (this.getHistoryIndex() < this.getHistory().length - 1) {
            this.setHistoryIndex(this.getHistoryIndex() + 1);
            return this.getHistory()[this.getHistoryIndex()];
        }
    }
}