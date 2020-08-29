// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as pwCommands from './personalwiki/events/pwCommands';
import * as pwWatcher from './personalwiki/events/pwWatcher';
import * as pwListener from './personalwiki/events/pwListener';

import * as pwTreeViewProv from './personalwiki/views/treeViewProvider';
import * as pwTagViewProv from './personalwiki/views/tagViewProvider';
import * as pwSearchViewProv from './personalwiki/views/searchViewProvider';

import * as history from './personalwiki/core/history';
import * as search from './personalwiki/core/search';
import { type } from 'os';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "personalWiki" is now active!');

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	//TODO if folder not open in workspace
	/*if(){
		vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, null, { uri: vscode.Uri.file(vscode.workspace.getConfiguration('') });
	}*/

	let wikiHistory = new history.History();
	let wikiSearch = new search.Search();

	const treeViewProv = new pwTreeViewProv.TreeViewProvider();
	vscode.window.registerTreeDataProvider('pw.TreeView', treeViewProv);
	let pwRefreshTreeView = vscode.commands.registerCommand('pw.RefreshTreeView', () => {
		treeViewProv.refresh();
	});
	const tagViewProv = new pwTagViewProv.TreeViewProvider();
	vscode.window.registerTreeDataProvider('pw.TagView', tagViewProv);
	let pwRefreshTagView = vscode.commands.registerCommand('pw.RefreshTagView', () => {
		tagViewProv.refresh();
	});
	const searchViewProv = new pwSearchViewProv.TreeViewProvider(wikiSearch);
	vscode.window.registerTreeDataProvider('pw.SearchView', searchViewProv);
	let pwRefreshSearchView = vscode.commands.registerCommand('pw.RefreshSearchView', () => {
		searchViewProv.refresh();
	});

	pwWatcher.pwWatcherEvents();
	pwCommands.pwRegisterCommands(wikiHistory, wikiSearch);
	pwListener.pwListener(wikiHistory);
}

// this method is called when your extension is deactivated
export function deactivate() { }