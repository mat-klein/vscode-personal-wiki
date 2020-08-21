import * as vscode from 'vscode';

import * as tag from '../core/tag';
import * as pwFS from '../core/filesystem';

export class TreeViewProvider implements vscode.TreeDataProvider<TagSubscription> {
	private tagViewStruct: vscode.ProviderResult<TagSubscription[]>;
	private _onDidChangeTreeData: vscode.EventEmitter<TagSubscription | undefined> = new vscode.EventEmitter<TagSubscription | undefined>();

	constructor() {
		this.tagViewStruct = this.getTagViewStruct();
	}

	readonly onDidChangeTreeData: vscode.Event<TagSubscription | undefined> = this._onDidChangeTreeData.event;

	refresh(): void {
		this.tagViewStruct = this.getTagViewStruct();
		this._onDidChangeTreeData.fire(undefined);
	}

	private async getTagViewStruct(): Promise<TagSubscription[]> {
		let subscribedTags = tag.getTagSubscribtions(String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiTags')));
		let tvStruct: TagSubscription[] = [];
		let wikiEntries: WikiEntry[] = [];
		let wikipages: string[] = [];

		subscribedTags.forEach((subElement) => {
			wikipages = tag.getWikifilesWithSub(subElement);
			wikipages.forEach((pageElement) => {
				wikiEntries.push(new WikiEntry(subElement, pwFS.getFileName(pageElement, true), pageElement, pwFS.getFolderOfFile(pageElement), vscode.TreeItemCollapsibleState.None));
			});

			tvStruct.push(new TagSubscription(subElement, wikiEntries));
			wikiEntries = [];
		});

		return Promise.resolve(tvStruct);
	}

	getTreeItem(element: TagSubscription): TagSubscription | Thenable<TagSubscription> {
		return element;
	}

	getChildren(element?: TagSubscription | undefined): vscode.ProviderResult<TagSubscription[]> {
		if (element === undefined) {
			return this.tagViewStruct;
		}
		return element.children;
	}
}

export class TagSubscription extends vscode.TreeItem {
	children: WikiEntry[] | undefined;

	constructor(
		public readonly tagSubLabel: string,
		children?: WikiEntry[]
	) {
		super(
			tagSubLabel,
			children === undefined ? vscode.TreeItemCollapsibleState.None :
				vscode.TreeItemCollapsibleState.Expanded);

		this.children = children;
	}

	get tooltip(): string {
		return `${this.label}`;
	}
}

export class WikiEntry extends vscode.TreeItem {
	children: WikiEntry[] | undefined;
	constructor(
		public readonly tagSubLabel: string,
		public readonly wikiTreeLabel: string,
		public readonly wikiTreePath: string,
		public readonly wikiParentDir: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		children?: WikiEntry[]
	) {
		super(wikiTreeLabel,

			children === undefined ? vscode.TreeItemCollapsibleState.None :
				vscode.TreeItemCollapsibleState.Expanded);
		this.children = children;
	}

	get tooltip(): string {
		return `${this.wikiTreePath}`;
	}
	get resourceUri(): vscode.Uri {
		let uri: vscode.Uri = vscode.Uri.parse(`${this.wikiTreePath}`);
		return uri;
	}
	get command(): vscode.Command {
		let cmd: vscode.Command = {
			command: 'pw.OpenWikiFile',
			arguments: [this.wikiTreePath],
			title: 'Open File'
		}
		return cmd;
	}
}