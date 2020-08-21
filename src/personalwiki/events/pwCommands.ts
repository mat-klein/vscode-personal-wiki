import * as readdirp from 'readdirp';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';


import * as tag from '../core/tag';
import * as link from '../core/link';
import * as pwFS from '../core/filesystem';
import * as template from '../core/template';
import * as impExp from '../core/importExport';

import * as tvProv from '../views/tagViewProvider';

import { History } from '../core/history';
import { Search } from '../core/search';
import rimraf = require('rimraf');
import { resolvePtr } from 'dns';
import { type } from 'os';

export function pwRegisterCommands(wikiHistroy: History, wikiSearch: Search) {
    let pwPath = String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiPath'));
    let itemToMove = "";

    let pwSelectWiki = vscode.commands.registerCommand('pw.SelectWiki', () => {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            canSelectFiles: false,
            canSelectFolders: true,
            openLabel: 'select wiki path'
        };

        vscode.window.showOpenDialog(options).then(async resource => {
            if (resource !== undefined) {
                let folderpath = resource[0].path.substring(1, resource[0].path.length);
                let folderURI = vscode.Uri.parse("file:///" + folderpath);

                if (vscode.workspace.getWorkspaceFolder(folderURI) !== undefined) {
                    await promUpdatePersonalWikiPath(folderpath);
                    pwPath = String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiPath'));

                    await tag.updateTagConfig();
                    await template.updateTemplateConfig();

                    wikiSearch.clearSearch();

                    vscode.commands.executeCommand('pw.RefreshTreeView');
                    vscode.commands.executeCommand('pw.RefreshTagView');
                    vscode.commands.executeCommand('pw.RefreshSearchView');
                } else {
                    if (pwFS.isRootDirOfPersonalWiki(folderpath)) {
                        vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, null, { uri: folderURI });

                        await promUpdatePersonalWikiPath(folderpath);
                        pwPath = String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiPath'));

                        await tag.updateTagConfig();
                        await template.updateTemplateConfig();

                        wikiSearch.clearSearch();

                        vscode.commands.executeCommand('pw.RefreshTreeView');
                        vscode.commands.executeCommand('pw.RefreshTagView');
                        vscode.commands.executeCommand('pw.RefreshSearchView');
                    } else {
                        vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, null, { uri: folderURI });

                        await promUpdatePersonalWikiPath(folderpath);
                        pwPath = String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiPath'));
                        pwFS.initPersonalWiki(folderpath);
                        pwFS.pwCreatePage("main", folderpath + '/', pwPath, false);

                        await tag.updateTagConfig();
                        await template.updateTemplateConfig();

                        wikiSearch.clearSearch();

                        vscode.commands.executeCommand('pw.RefreshTreeView');
                        vscode.commands.executeCommand('pw.RefreshTagView');
                        vscode.commands.executeCommand('pw.RefreshSearchView');
                    }
                }
            }
        });
    });

    let pwOpenWikiFile = vscode.commands.registerCommand('pw.OpenWikiFile', (resource) => {
        let textDoc: vscode.TextDocument;
        let mdEditors: number[] = [];
        let fileOpend = false;

        if (resource !== undefined && fs.lstatSync(resource).isFile()) {
            vscode.workspace.textDocuments.forEach(knownTextDocuments => {
                if (!fileOpend) {
                    if (knownTextDocuments.fileName.replace(/\\/g, '/').includes(resource)) {
                        textDoc = knownTextDocuments;
                        vscode.window.visibleTextEditors.forEach(editor => {
                            if (editor.document.fileName.replace(/\\/g, '/') === resource) {
                                if (!fileOpend) {
                                    vscode.window.showTextDocument(textDoc, editor.viewColumn);
                                    fileOpend = true;
                                }
                            } else if (editor.viewColumn !== undefined && editor.document.languageId === "markdown") {
                                mdEditors.push(editor.viewColumn);
                            }
                        });

                        if (!fileOpend && mdEditors.length > 0) {
                            vscode.window.showTextDocument(textDoc, mdEditors[0]);
                            fileOpend = true;
                        }
                    }
                }
            });

            if (!fileOpend && vscode.window.visibleTextEditors.length > 0) {
                vscode.window.visibleTextEditors.forEach(async (editor) => {
                    if (!fileOpend) {
                        await vscode.window.showTextDocument(editor.document, editor.viewColumn);
                        vscode.window.showTextDocument(vscode.Uri.parse("file:///" + resource));
                        fileOpend = true;
                    }
                });
            } else if (!fileOpend) {
                vscode.window.showTextDocument(vscode.Uri.parse("file:///" + resource));
            }
        }
    });

    let pwNewPage = vscode.commands.registerCommand('pw.NewPage', async (resource) => {
        const input = await vscode.window.showInputBox({
            placeHolder: "enter pagename ...",
            validateInput: (text: string): string | undefined => {
                if (text.match(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g)) {
                    return 'Wikipages can not contain special characters';
                } else {
                    return undefined;
                }
            }
        });

        if (input !== undefined) {
            if (resource !== undefined) {
                if (pwFS.isFolder(resource.wikiTreePath)) {
                    pwFS.pwCreatePage(input, resource.wikiTreePath, pwPath, false);
                } else {
                    pwFS.pwCreatePage(input, pwFS.getFolderOfFile(resource.wikiTreePath), pwPath, false);
                }
            } else {
                if (vscode.window.activeTextEditor?.document.uri.path !== undefined) {
                    let currentDocumentPath = "" + vscode.window.activeTextEditor?.document.uri.path;
                    currentDocumentPath = currentDocumentPath?.substring(1, currentDocumentPath.length);
                    if (vscode.window.activeTextEditor?.document.languageId === "markdown" && pwFS.isPartOfPersonalWiki(currentDocumentPath)) {
                        resource = { wikiTreePath: currentDocumentPath };
                        pwFS.pwCreatePage(input, pwFS.getFolderOfFile(resource.wikiTreePath), pwPath, false);
                    } else {
                        vscode.window.showInformationMessage("No Wikifolder or Wikipage selected/active");
                    }
                } else {
                    vscode.window.showInformationMessage("No Wikifolder or Wikipage selected/active");
                }
            }
        }
    });
    let pwNewChildPage = vscode.commands.registerCommand('pw.NewChildPage', async (resource) => {
        const input = await vscode.window.showInputBox({
            placeHolder: "enter pagename ...",
            validateInput: (text: string): string | undefined => {
                if (text.match(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g)) {
                    return 'Wikipages can not contain special characters';
                } else {
                    return undefined;
                }
            }
        });

        if (input !== undefined) {
            if (resource !== undefined) {
                if (pwFS.isFolder(resource.wikiTreePath)) {
                    pwFS.pwCreatePage(input, resource.wikiTreePath, pwPath, false);
                } else {
                    pwFS.pwCreatePage(input, resource.wikiTreePath, pwPath, true);
                }
            } else {
                if (vscode.window.activeTextEditor?.document.uri.path !== undefined) {
                    let currentDocumentPath = "" + vscode.window.activeTextEditor?.document.uri.path;
                    currentDocumentPath = currentDocumentPath?.substring(1, currentDocumentPath.length);
                    if (vscode.window.activeTextEditor?.document.languageId === "markdown" && pwFS.isPartOfPersonalWiki(currentDocumentPath)) {
                        resource = { wikiTreePath: currentDocumentPath };
                        pwFS.pwCreatePage(input, resource.wikiTreePath, pwPath, true);
                    } else {
                        vscode.window.showInformationMessage("No Wikifolder or Wikipage selected/active");
                    }
                } else {
                    vscode.window.showInformationMessage("No Wikifolder or Wikipage selected/active");
                }
            }
        }
    });
    let pwNewFolder = vscode.commands.registerCommand('pw.NewFolder', async (resource) => {
        const input = await vscode.window.showInputBox({
            placeHolder: "enter foldername ...",
            validateInput: (text: string): string | undefined => {
                if (text.match(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g)) {
                    return 'Foldernames can not contain special characters';
                } else {
                    return undefined;
                }
            }
        });

        if (input !== undefined && resource !== undefined) {
            if (pwFS.isFolder(resource.wikiTreePath)) {
                pwFS.pwCreateFolder(input, resource.wikiTreePath);
            } else {
                pwFS.pwCreateFolder(input, pwFS.getFolderOfFile(resource.wikiTreePath));
            }
            vscode.commands.executeCommand("pw.RefreshTreeView");
        }
    });

    let pwCutWikiItem = vscode.commands.registerCommand('pw.Cut', (resource) => {
        if (resource !== undefined) {
            itemToMove = resource.wikiTreePath;
        }
    });
    let pwPasteWikiItem = vscode.commands.registerCommand('pw.Paste', async (resource) => {
        if (resource !== undefined && itemToMove !== "") {
            let itemPath;
            if (pwFS.isFolder(itemToMove)) {
                itemPath = itemToMove.substring(0, itemToMove.length - 1);
                itemPath = itemPath.substring(0, itemPath.lastIndexOf("/") + 1);
            } else {
                itemPath = pwFS.getFolderOfFile(itemToMove);
            }

            let resourcePath;
            if (pwFS.isFolder(resource.wikiTreePath)) {
                resourcePath = resource.wikiTreePath;
            } else {
                resourcePath = pwFS.getFolderOfFile(resource.wikiTreePath);
            }
            if (itemPath.toLowerCase() !== resourcePath.toLowerCase()) {
                if (pwFS.isFolder(itemToMove) && pwFS.isFolder(resource.wikiTreePath) && !fs.existsSync(resource.wikiTreePath + pwFS.getFolderName(itemToMove))) {
                    let allPath: string[] = pwFS.getAllFilePathOfDir(itemToMove);
                    let changedLinks: [{ oldLink: string, newLink: string }] = [{ oldLink: "", newLink: "" }];

                    allPath.forEach(element => {
                        let newPath = resource.wikiTreePath + pwFS.getFolderName(itemToMove) + element.substring(itemToMove.length, element.length);

                        link.filePathChanged(element, newPath);
                        changedLinks.push({ oldLink: element, newLink: newPath });
                    });

                    await pwFS.moveWikiItem(itemToMove, resource.wikiTreePath + pwFS.getFolderName(itemToMove));

                    changedLinks.forEach(linkEle => {
                        if (linkEle.oldLink !== "" && linkEle.newLink !== "") {
                            link.linkChanged(linkEle.oldLink, linkEle.newLink);
                        }
                    });
                } else if (pwFS.isFolder(itemToMove) && !pwFS.isFolder(resource.wikiTreePath) && !fs.existsSync(pwFS.getFolderOfFile(resource.wikiTreePath) + pwFS.getFolderName(itemToMove))) {
                    let allPath: string[] = pwFS.getAllFilePathOfDir(itemToMove);
                    let changedLinks: [{ oldLink: string, newLink: string }] = [{ oldLink: "", newLink: "" }];

                    allPath.forEach(element => {
                        let newPath = pwFS.getFolderOfFile(resource.wikiTreePath) + pwFS.getFolderName(itemToMove) + element.substring(itemToMove.length, element.length);

                        link.filePathChanged(element, newPath);
                        changedLinks.push({ oldLink: element, newLink: newPath });
                    });

                    await pwFS.moveWikiItem(itemToMove, pwFS.getFolderOfFile(resource.wikiTreePath) + pwFS.getFolderName(itemToMove));

                    changedLinks.forEach(linkEle => {
                        if (linkEle.oldLink !== "" && linkEle.newLink !== "") {
                            link.linkChanged(linkEle.oldLink, linkEle.newLink);
                        }
                    });
                } else if (!pwFS.isFolder(itemToMove) && pwFS.isFolder(resource.wikiTreePath) && !fs.existsSync(resource.wikiTreePath + pwFS.getFileName(itemToMove, true))) {
                    link.filePathChanged(itemToMove, resource.wikiTreePath + pwFS.getFileName(itemToMove, true));
                    link.linkChanged(itemToMove, resource.wikiTreePath + pwFS.getFileName(itemToMove, true));

                    pwFS.moveWikiItem(itemToMove, resource.wikiTreePath + pwFS.getFileName(itemToMove, true));
                } else if (!pwFS.isFolder(itemToMove) && !pwFS.isFolder(resource.wikiTreePath) && !fs.existsSync(pwFS.getFolderOfFile(resource.wikiTreePath) + pwFS.getFileName(itemToMove, true))) {
                    link.filePathChanged(itemToMove, pwFS.getFolderOfFile(resource.wikiTreePath) + pwFS.getFileName(itemToMove, true));
                    link.linkChanged(itemToMove, pwFS.getFolderOfFile(resource.wikiTreePath) + pwFS.getFileName(itemToMove, true));

                    pwFS.moveWikiItem(itemToMove, pwFS.getFolderOfFile(resource.wikiTreePath) + pwFS.getFileName(itemToMove, true));
                } else {
                    const input = await vscode.window.showInputBox({
                        placeHolder: "Already exists! Please enter new name ...",
                        validateInput: (text: string): string | undefined => {
                            if (text.match(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g) && !text.match(/ /g)) {
                                return 'Can not contain special characters';
                            } else {
                                return undefined;
                            }
                        }
                    });

                    let type = ".md";
                    if (pwFS.isFolder(itemToMove)) {
                        type = "/";
                    }

                    if (pwFS.isFolder(resource.wikiTreePath)) {
                        pwFS.moveWikiItem(itemToMove, resource.wikiTreePath + input + type);
                    } else {
                        pwFS.moveWikiItem(itemToMove, pwFS.getFolderOfFile(resource.wikiTreePath) + input + type);
                    }
                }

                itemToMove = "";
                wikiHistroy.clearHistory();
                wikiSearch.clearSearch();

                vscode.commands.executeCommand('pw.RefreshTreeView');
                vscode.commands.executeCommand('pw.RefreshTagView');
                vscode.commands.executeCommand('pw.RefreshSearchView');
            }
        }
    });
    let pwRenameWikiItem = vscode.commands.registerCommand('pw.Rename', (resource) => {
        if (resource !== undefined) {
            console.log(resource.wikiTreePath);

        }
    });
    let pwDeleteWikiItem = vscode.commands.registerCommand('pw.Delete', async (resource) => {
        if (resource !== undefined) {
            if (pwFS.isFolder(resource.wikiTreePath) && fs.existsSync(resource.wikiTreePath)) {
                let allFiles: string[] = pwFS.getAllFilePathOfDir(resource.wikiTreePath);

                rimraf.sync(resource.wikiTreePath);

                allFiles.forEach(file => {
                    tag.deleteFileFromTagJSON(file);
                });
                wikiHistroy.clearHistory();
                wikiSearch.clearSearch();

                vscode.commands.executeCommand('pw.RefreshTreeView');
                vscode.commands.executeCommand('pw.RefreshTagView');
                vscode.commands.executeCommand('pw.RefreshSearchView');
            } else if (fs.existsSync(resource.wikiTreePath)) {
                fs.unlinkSync(resource.wikiTreePath);

                tag.deleteFileFromTagJSON(resource.wikiTreePath);
                wikiHistroy.clearHistory();
                wikiSearch.clearSearch();

                vscode.commands.executeCommand('pw.RefreshTreeView');
                vscode.commands.executeCommand('pw.RefreshTagView');
                vscode.commands.executeCommand('pw.RefreshSearchView');
            }
        }
    });

    let pwSubscribeTags = vscode.commands.registerCommand('pw.SubscribeTags', async () => {
        const input = await vscode.window.showInputBox({
            placeHolder: "subscribe to tag (select multiple with '|') ...",
            validateInput: (text: string): string | undefined => {
                if (text.match(/[~`!#$%\^&*+=\-\[\]\\';,/{}\\":<>\?]/g)) {
                    return 'Tags can only contain numbers and characters';
                } else {
                    return undefined;
                }
            }
        });

        if (input !== undefined) {
            tag.addNewSubscription(input);
        }
    });
    let pwUnSubscribeTags = vscode.commands.registerCommand('pw.UnsubscribeTags', async (resource: tvProv.TagSubscription) => {
        if (resource !== undefined) {
            tag.deleteSubscription(resource.tagSubLabel.replace('[', '').replace(']', ''));
        } else {
            const input = await vscode.window.showInputBox({
                placeHolder: "unsubscribe to tag (separate with '|') ...",
                validateInput: (text: string): string | undefined => {
                    if (text.match(/[~`!#$%\^&*+=\-\[\]\\';,/{}\\":<>\?]/g)) {
                        return 'Tags can only contain numbers and characters';
                    } else {
                        return undefined;
                    }
                }
            });
            if (input !== undefined) {
                tag.deleteSubscription(input);
            }
        }
    });
    let pwUpdateTagID = vscode.commands.registerCommand('pw.UpdateTagIdentifier', async () => {
        const input = await vscode.window.showInputBox({
            placeHolder: "subscribe to tag (select multiple with '|') ..."
        });

        if (input !== undefined) {
            await tag.updateTagPageIdentifier(input);

            vscode.commands.executeCommand('pw.RefreshTagView');
            vscode.commands.executeCommand('pw.RefreshSearchView');
        }
    });

    let pwSearch = vscode.commands.registerCommand('pw.Search', async () => {
        const input = await vscode.window.showInputBox({
            placeHolder: " search personal wiki ..."
        });

        if (input !== undefined) {
            wikiSearch.setSearchFiles(input);
            wikiSearch.setSearchTags(input);
            wikiSearch.setSearchContent(input);

            vscode.commands.executeCommand('pw.RefreshSearchView');
        }
    });

    let pwNewDefaultTemplate = vscode.commands.registerCommand('pw.NewDefaultTemplate', async () => {
        const input = await vscode.window.showQuickPick(template.getAllTemplatesID());

        if (input !== undefined) {
            template.setDefaultTemp(input);
        }
    });
    let pwInsertTemplate = vscode.commands.registerCommand('pw.InsertTemplate', async (resource) => {
        const input = await vscode.window.showQuickPick(template.getAllTemplatesID());

        if (input !== undefined) {
            let insertTemp = template.getTemplateContent(input);
            let activeEdit = vscode.window.activeTextEditor;

            if (activeEdit !== undefined) {
                vscode.window.showTextDocument(activeEdit.document, activeEdit.viewColumn, false).then(e => {
                    e.edit(edit => {
                        edit.insert(e.selection.active, insertTemp);
                    });
                });
            }
        }
    });
    let pwAddTemplate = vscode.commands.registerCommand('pw.AddTemplate', async (resource) => {
        let templateStruct;
        if (vscode.window.activeTextEditor !== undefined) {
            let range = new vscode.Range(vscode.window.activeTextEditor?.selection.start, vscode.window.activeTextEditor?.selection.end);
            templateStruct = vscode.window.activeTextEditor?.document.getText(range);
        }

        if (templateStruct !== undefined && templateStruct !== "") {
            const input = await vscode.window.showInputBox({
                placeHolder: "enter template name ..."
                /*,
                validateInput: (text: string): string | undefined => {
                    if (text.match(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g)) {
                        return 'Wikipages can not contain special characters';
                    } else {
                        return undefined;
                    }
                }*/
            });

            if (input !== undefined) {
                template.addNewTemplate(input, templateStruct);
            }
        } else if (templateStruct === "") {
            vscode.window.showInformationMessage("No template selected!");
        }
    });
    let pwDeleteTemplate = vscode.commands.registerCommand('pw.DeleteTemplate', async (resource) => {
        const input = await vscode.window.showQuickPick(template.getAllTemplatesID());

        if (input !== undefined) {
            template.deleteTemplate(input);
        }
    });

    let pwLastWikiPage = vscode.commands.registerCommand('pw.LastWikiPage', () => {
        let lastPage = wikiHistroy.lastPage();
        wikiHistroy.setHistoryLock(true);

        if (lastPage !== undefined) {
            vscode.commands.executeCommand('pw.OpenWikiFile', lastPage);
        }
    });
    let pwNextPage = vscode.commands.registerCommand('pw.NextWikiPage', async () => {
        let nextPage = wikiHistroy.nextPage();
        wikiHistroy.setHistoryLock(true);

        if (nextPage !== undefined) {
            vscode.commands.executeCommand('pw.OpenWikiFile', nextPage);
        }
    });

    let pwInsertImage = vscode.commands.registerCommand('pw.InsertImage', () => {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            canSelectFiles: true,
            canSelectFolders: false,
            openLabel: 'select image',
            filters: {
                'Images': ['png', 'jpg', 'gif']
            }
        };

        vscode.window.showOpenDialog(options).then(async resource => {
            if (resource !== undefined) {
                let activeEdit = vscode.window.activeTextEditor;
                let imgPath = pwFS.copyExternImage(resource[0].path.substring(1, resource[0].path.length));

                if (activeEdit !== undefined) {
                    vscode.window.showTextDocument(activeEdit.document, activeEdit.viewColumn, false).then(e => {
                        e.edit(edit => {
                            let docPath = e.document.uri.path.substring(1, e.document.uri.path.length);
                            if (imgPath !== undefined) {
                                let relPath = path.relative(docPath, imgPath).replace(/\\/g, "/");
                                relPath = relPath.substring(0, relPath.lastIndexOf("/../")).concat("/./" + relPath.substring(relPath.lastIndexOf("/../") + 4, relPath.length));

                                if (pwFS.isSubFolder(docPath, imgPath)) {
                                    relPath = relPath.substring(1, relPath.length);
                                }

                                edit.insert(e.selection.active, "![Alternativ Text](" + relPath + ")");
                            }
                        });
                    });
                }
            }
        });
    });
    let pwInsertWikiLink = vscode.commands.registerCommand('pw.InsertWikiLink', async () => {
        let activeEdit = vscode.window.activeTextEditor;

        if (activeEdit !== undefined) {
            const input = await vscode.window.showQuickPick(link.getAllWikiLinksOfPath(activeEdit.document.uri.path.substring(1, activeEdit.document.uri.path.length)));

            vscode.window.showTextDocument(activeEdit.document, activeEdit.viewColumn, false).then(e => {
                e.edit(async edit => {
                    let docPath = e.document.uri.path.substring(1, e.document.uri.path.length);

                    if (input !== undefined) {
                        let relPath = path.relative(docPath, input).replace(/\\/g, "/");
                        relPath = relPath.substring(0, relPath.lastIndexOf("/../")).concat("/./" + relPath.substring(relPath.lastIndexOf("/../") + 4, relPath.length));

                        if (pwFS.isSubFolder(docPath, input)) {
                            relPath = relPath.substring(1, relPath.length);
                        }

                        edit.insert(e.selection.active, "[" + pwFS.getFileName(relPath, false) + "](" + relPath + ")");
                    }
                });
            });
        }
    });

    let pwImportMarkdownFiles = vscode.commands.registerCommand('pw.ImportMarkdownFiles', (resource) => {
        if (resource !== undefined) {
            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: 'import files'
            };

            vscode.window.showOpenDialog(options).then(async mdFiles => {
                if (mdFiles !== undefined) {
                    let allMDFiles: string[] = [];

                    function recursivRead(dir: string) {
                        fs.readdirSync(dir).forEach(file => {
                            let fullPath = path.join(dir, file);
                            if (fs.lstatSync(fullPath).isDirectory()) {
                                recursivRead(fullPath);
                            } else if (fullPath.endsWith(".md") || fullPath.endsWith(".markdown")) {
                                allMDFiles.push(fullPath.replace(/\\/g, "/"));
                            }
                        });
                    }
                    recursivRead(mdFiles[0].path.substring(1, mdFiles[0].path.length));

                    if (!pwFS.isFolder(resource.wikiTreePath)) {
                        resource.wikiTreePath = pwFS.getFolderOfFile(resource.wikiTreePath);
                    }
                    allMDFiles.forEach(mdFile => {
                        let tPath = mdFiles[0].path.substring(1, mdFiles[0].path.length);
                        let newPath = resource.wikiTreePath + mdFile.substring(tPath.length + 1, mdFile.length);

                        impExp.importMarkdownFiles(mdFile, pwFS.getFolderOfFile(newPath));
                    });
                }
            });
        }
    });
    let pwExportMarkdownFiles = vscode.commands.registerCommand('pw.ExportMarkdownFiles', (resource) => {
        if (resource !== undefined) {
            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: 'select export path'
            };

            vscode.window.showOpenDialog(options).then(async targetPath => {
                if (targetPath !== undefined) {
                    let expType = await vscode.window.showQuickPick(["pdf", "html", "latex"]);

                    let panOpt = await vscode.window.showInputBox({
                        placeHolder: "enter pandoc options ...",
                        validateInput: (text: string): string | undefined => {
                            if (text.match(/[~`!#$%\^&*+=\[\]\\';,/{}|\\":<>\?]/g)) {
                                return 'Wikipages can not contain special characters';
                            } else {
                                return undefined;
                            }
                        }
                    });

                    if (panOpt === undefined) {
                        panOpt = "";
                    }

                    if (expType !== undefined) {
                        if (pwFS.isFolder(resource.wikiTreePath)) {
                            let allFiles: string[] = pwFS.getAllFilePathOfDir(resource.wikiTreePath);

                            allFiles.forEach(file => {
                                let tPath = targetPath[0].path.substring(1, targetPath[0].path.length).concat("/");
                                let newPath = tPath + pwFS.getFolderName(resource.wikiTreePath) + file.substring(resource.wikiTreePath.length, file.length);

                                if (expType !== undefined && panOpt !== undefined) {
                                    impExp.exportMarkdownFiles(file, pwFS.getFolderOfFile(newPath), expType, panOpt);
                                }
                            });
                        } else {
                            impExp.exportMarkdownFiles(resource.wikiTreePath, targetPath[0].path.substring(1, targetPath[0].path.length).concat("/"), expType, panOpt);
                        }
                    }
                }
            });
        }
    });
    let pwExportPersonalWiki = vscode.commands.registerCommand('pw.ExportPersonalWiki', () => {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            canSelectFiles: false,
            canSelectFolders: true,
            openLabel: 'export path'
        };

        vscode.window.showOpenDialog(options).then(async targetPath => {
            if (targetPath !== undefined) {
                let expType = await vscode.window.showQuickPick(["pdf", "html", "latex"]);

                let panOpt = await vscode.window.showInputBox({
                    placeHolder: "enter pandoc options ...",
                    validateInput: (text: string): string | undefined => {
                        if (text.match(/[~`!#$%\^&*+=\[\]\\';,/{}|\\":<>\?]/g)) {
                            return 'enter valid pandoc options';
                        } else {
                            return undefined;
                        }
                    }
                });

                if (panOpt === undefined) {
                    panOpt = "";
                }

                if (expType !== undefined) {
                    let allFiles = pwFS.getAllFilePath();

                    allFiles.forEach(file => {
                        let tPath = targetPath[0].path.substring(1, targetPath[0].path.length).concat("/");
                        let newPath = tPath + pwFS.getFolderName(pwPath) + file.elementPath.substring(pwPath.length, file.elementPath.length);

                        if (expType !== undefined && panOpt !== undefined) {
                            impExp.exportMarkdownFiles(file.elementPath, pwFS.getFolderOfFile(newPath), expType, panOpt);
                        }
                    });
                }
            }
        });
    });

    function promUpdatePersonalWikiPath(newPWpath: string) {
        return Promise.resolve(vscode.workspace.getConfiguration('personalwiki.general').update('wikiPath', newPWpath + '/', vscode.ConfigurationTarget.Global));
    };
}