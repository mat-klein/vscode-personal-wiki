import * as fs from 'fs';
import * as vscode from 'vscode';

import * as pwFS from '../core/filesystem';

export class TreeViewProvider implements vscode.TreeDataProvider<WikiEntry> {
	private wikiStruct: vscode.ProviderResult<WikiEntry[]>;
	private _onDidChangeTreeData: vscode.EventEmitter<WikiEntry | undefined> = new vscode.EventEmitter<WikiEntry | undefined>();
	readonly onDidChangeTreeData: vscode.Event<WikiEntry | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		this.wikiStruct = this.getWikiStruct();
	}

	refresh(): void {
		this.wikiStruct = this.getWikiStruct();
		this._onDidChangeTreeData.fire(undefined);
	}

	private async getWikiStruct(): Promise<WikiEntry[]> {
		await pwFS.pwPathToConfigJSON(pwFS.getPWPath());
		let jsObj = JSON.parse(fs.readFileSync(pwFS.getPWConfigPath(), 'UTF-8'));
		let eleArray = jsObj.element.elementChildren;

		function jsElements(ele: any[]): WikiEntry[] {
			let temp: WikiEntry[] = [];
			ele.forEach((element: any) => {
				if (element.isDirectory === true && element.elementChildren.length !== 0) {
					let result = jsElements(element.elementChildren);
					temp.push(new WikiEntry(element.elementLabel, element.elementPath, vscode.TreeItemCollapsibleState.Collapsed, result));
				} else {
					temp.push(new WikiEntry(element.elementLabel, element.elementPath, vscode.TreeItemCollapsibleState.None, []));
				}
			});
			return temp;
		}
		
		let rootEle: WikiEntry[] =  [new WikiEntry(jsObj.element.elementLabel, jsObj.element.elementPath, vscode.TreeItemCollapsibleState.Collapsed, jsElements(eleArray))];
		return Promise.resolve(rootEle);
	}

	getTreeItem(element: WikiEntry): WikiEntry | Thenable<WikiEntry> {
		return {
			wikiTreeLabel: element.wikiTreeLabel,
			wikiTreePath: element.wikiTreePath,
			collapsibleState: element.collapsibleState,
			children: element.children,
			tooltip: element.tooltip,
			resourceUri: element.resourceUri,
			command: {
				command: 'pw.OpenWikiFile',
				arguments: [element.wikiTreePath],
				title: 'Open File'
			}
		};
	}

	getChildren(element?: WikiEntry | undefined): vscode.ProviderResult<WikiEntry[]> {
		if (element === undefined) {
			return this.wikiStruct;
		}
		return element.children;
	}
}

export class WikiEntry extends vscode.TreeItem {
	children: WikiEntry[] | undefined;
	constructor(
		public readonly wikiTreeLabel: string,
		public readonly wikiTreePath: string,
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
}