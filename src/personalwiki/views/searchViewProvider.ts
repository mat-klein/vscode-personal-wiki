import * as vscode from 'vscode';

import * as search from '../core/search';
import * as pwFS from '../core/filesystem';

export class TreeViewProvider implements vscode.TreeDataProvider<SearchResults> {
	private wikiSearch: search.Search;
	private searchViewStruct: vscode.ProviderResult<SearchResults[]>;
	private _onDidChangeTreeData: vscode.EventEmitter<SearchResults | undefined> = new vscode.EventEmitter<SearchResults | undefined>();

	constructor(search: search.Search) {
		this.wikiSearch = search;
		this.searchViewStruct = this.getSearchViewStruct();
	}

	readonly onDidChangeTreeData: vscode.Event<SearchResults | undefined> = this._onDidChangeTreeData.event;

	refresh(): void {
		this.searchViewStruct = this.getSearchViewStruct();
		this._onDidChangeTreeData.fire(undefined);
	}

	private async getSearchViewStruct(): Promise<SearchResults[]> {
		let searchStruct: SearchResults[] = [];
		let searchResults: WikiEntry[] = [];

		this.wikiSearch.getSearchFiles().forEach(file => {
			searchResults.push(new WikiEntry("files", pwFS.getFileName(file, true), file, pwFS.getFolderOfFile(file), vscode.TreeItemCollapsibleState.None));
		});
		searchStruct.push(new SearchResults("filename", searchResults));
		searchResults = [];

		this.wikiSearch.getSearchTags().forEach(file => {
			searchResults.push(new WikiEntry("tags", pwFS.getFileName(file, true), file, pwFS.getFolderOfFile(file), vscode.TreeItemCollapsibleState.None));
		});
		searchStruct.push(new SearchResults("matching tag", searchResults));
		searchResults = [];

		this.wikiSearch.getSearchContent().forEach(file => {
			searchResults.push(new WikiEntry("content", pwFS.getFileName(file, true), file, pwFS.getFolderOfFile(file), vscode.TreeItemCollapsibleState.None));
		});
		searchStruct.push(new SearchResults("within file", searchResults));
		searchResults = [];

		return Promise.resolve(searchStruct);
	}

	getTreeItem(element: SearchResults): SearchResults | Thenable<SearchResults> {
		return element;
	}

	getChildren(element?: SearchResults | undefined): vscode.ProviderResult<SearchResults[]> {
		if (element === undefined) {
			return this.searchViewStruct;
		}
		return element.children;
	}
}

export class SearchResults extends vscode.TreeItem {
	children: WikiEntry[] | undefined;

	constructor(
		public readonly searchLabel: string,
		children?: WikiEntry[]
	) {
		super(
			searchLabel,
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
		public readonly searchLabel: string,
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