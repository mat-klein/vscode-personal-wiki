import * as vscode from 'vscode';

import * as pwFS from '../core/filesystem';

import { History } from '../core/history';

export function pwListener(history: History) {

	let listenerActiveTextEditor = function (editor: any) {
		if (vscode.window.activeTextEditor?.document.uri.path !== undefined) {
			let activePath = vscode.window.activeTextEditor?.document.uri.path.substring(1, vscode.window.activeTextEditor?.document.uri.path.length)
			if (vscode.window.activeTextEditor.document.languageId == "markdown" &&
				pwFS.isPartOfPersonalWiki(activePath) &&
				history.getPreviousTextDocPath() !== activePath &&
				history.getHistroyLock() !== true
			) {
				history.setPreviousTextDocPath(activePath);
				history.updateHistroy(activePath);
			} else if (history.getHistroyLock() === true) {
				history.setHistoryLock(false);
			}
		}
	};

	let _onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(listenerActiveTextEditor);
}
