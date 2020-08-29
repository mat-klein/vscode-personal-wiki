import * as vscode from 'vscode';

import * as pwFS from '../core/filesystem';
import * as tag from '../core/tag';
import * as link from '../core/link';

export function pwWatcherEvents() {

    let fsWatcher = vscode.workspace.createFileSystemWatcher("**/*.md", false, false, true);
    fsWatcher.onDidCreate(() => {
        vscode.commands.executeCommand('pw.RefreshTreeView');
        vscode.commands.executeCommand('pw.RefreshTagView');
        vscode.commands.executeCommand('pw.RefreshSearchView');
    });
    fsWatcher.onDidChange(() => {
        vscode.commands.executeCommand('pw.RefreshTreeView');
        vscode.commands.executeCommand('pw.RefreshTagView');
        vscode.commands.executeCommand('pw.RefreshSearchView');
    });

    let saveWatcher = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        let path = document.uri.path.substring(1, document.uri.path.length);
        if (document.languageId === "markdown" && document.uri.scheme === "file" && pwFS.isPartOfPersonalWiki(path)) {
            tag.updateTagsOfWikipage(path);
            link.updateLinksOfFile(path);
        }
    });
}