import * as fs from 'fs';
import * as vscode from 'vscode';

import * as template from './template';
import * as link from './link';
import * as tag from './tag';

interface WikiConfig {
    path: string;
    element: WikiElement;
}
interface WikiElement {
    elementLabel: string;
    elementPath: string;
    parentDir: string;
    isDirectory: boolean;
    elementChildren: WikiElement[];
}


export function initPersonalWiki(path: string) {
    let pwIgnorePath = path + "/.pwignore/";
    let defaultPage: WikiElement = { elementLabel: "root", elementPath: path + "/", parentDir: "", isDirectory: true, elementChildren: [] };
    let newConfig: WikiConfig = { path: path + "/", element: defaultPage };
    let defaultTag = tag.initDefaultTag(path + "/main.md");
    let defaultLink = link.initDefaultLink();
    let defaultTemplate = template.initDefaultTemplate();


    pwCreateFolder(".pwignore", path);
    pwCreateFolder("tempImages", path + "/.pwignore");

    fs.writeFileSync(pwIgnorePath + "pwConfig.json", JSON.stringify(newConfig, undefined, 2), 'utf8');
    fs.writeFileSync(pwIgnorePath + "pwTag.json", JSON.stringify(defaultTag, undefined, 2), 'utf8');
    fs.writeFileSync(pwIgnorePath + "pwLink.json", JSON.stringify(defaultLink, undefined, 2), 'utf8');
    fs.writeFileSync(pwIgnorePath + "pwTemplates.json", JSON.stringify(defaultTemplate, undefined, 2), 'utf8');
}

export function getPWPath(): string {
    let personalWikiPath = String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiPath'));
    return personalWikiPath;
}
export function getPWConfigPath(): string {
    let path = getPWPath();
    path = path.concat(".pwignore/pwConfig.json");
    return path;
}
export function getPWConfigJSON(): string {
    let content = fs.readFileSync(getPWConfigPath(), 'utf8');
    return content;
}
export async function pwPathToConfigJSON(path: string) {
    let elements: string[] = [];
    let wikiElement: WikiElement = { elementLabel: "root", elementPath: path, parentDir: "", isDirectory: true, elementChildren: [] };
    let configJSON: WikiConfig = { path: path, element: wikiElement };

    function readElements(elePath: string) {
        return new Promise(function (resolve, reject) {
            return fs.readdir(elePath, (err, filenames) => {
                if (err) {
                    reject(err);
                } else {
                    elements = filenames;
                    resolve(filenames);
                }
            });
        });
    }

    async function elementsToJSON(elePath: string, curJSON: WikiElement): Promise<WikiElement> {
        let currentElement: WikiElement = curJSON;

        await readElements(elePath);
        if (elements.length > 0) {
            for (const element of elements) {
                if (fs.lstatSync(elePath + element).isDirectory() && element !== ".pwignore" && element !== ".git") {
                    let recursiveElement: WikiElement = { elementLabel: element, elementPath: elePath + element + '/', parentDir: elePath, isDirectory: true, elementChildren: [] };
                    let returnElement: WikiElement = { elementLabel: "none", elementPath: "none", parentDir: "none", isDirectory: false, elementChildren: [] };
                    const contents = await elementsToJSON(elePath + element + '/', recursiveElement)
                        .then(function (res) {
                            returnElement.elementLabel = res.elementLabel;
                            returnElement.elementPath = res.elementPath;
                            returnElement.parentDir = res.parentDir;
                            returnElement.isDirectory = res.isDirectory;
                            returnElement.elementChildren = res.elementChildren;
                            currentElement.elementChildren.push(returnElement);
                        });
                } else if (element.endsWith(".md") || (element.endsWith(".markdown"))) {
                    currentElement.elementChildren.push({ elementLabel: element, elementPath: elePath + element, parentDir: elePath, isDirectory: false, elementChildren: [] });
                }
            }
        }

        return new Promise<WikiElement>((resolve) => {
            wikiElement = currentElement;
            resolve(currentElement);
        });
    }
    await elementsToJSON(path, wikiElement);
    configJSON.element = wikiElement;
    updateWikiFile(getPWConfigPath(), JSON.stringify(configJSON, undefined, 2));

    //TODO timeout workaround entfernen
    return new Promise<any>((resolve, reject) => {
        setTimeout(() => {
            resolve('done!');
        }, 2000);
    });
}

export function getPWLinkPath(): string {
    let pathLinkJSON = String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiPath'));
    pathLinkJSON = pathLinkJSON.concat(".pwignore/pwLink.json");
    return pathLinkJSON;
}
export function getPWLinkJSON(): string {
    let content = fs.readFileSync(getPWLinkPath(), 'utf8');
    return content;
}
export function updatePWLinkJSON(content: string) {
    fs.writeFileSync(getPWLinkPath(), content, 'utf8');
}

export function getPWTagPath(): string {
    let pathTagJSON = String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiPath'));
    pathTagJSON = pathTagJSON.concat(".pwignore/pwTag.json");
    return pathTagJSON;
}
export function getPWTagJSON(): string {
    let content = fs.readFileSync(getPWTagPath(), 'utf8');
    return content;
}
export function updatePWTagJSON(content: string) {
    fs.writeFileSync(getPWTagPath(), content, 'utf8');
}

export function getPWTemplatePath(): string {
    let pathTempJSON = String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiPath'));
    pathTempJSON = pathTempJSON.concat(".pwignore/pwTemplates.json");
    return pathTempJSON;
}
export function getPWTemplateJSON(): string {
    let content = fs.readFileSync(getPWTemplatePath(), 'utf8');
    return content;
}
export function updatePWTemplateJSON(content: string) {
    fs.writeFileSync(getPWTemplatePath(), content, 'utf8');
}

export function getTempImagePath(): string {
    let pathTempImages = String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiPath'));
    pathTempImages = pathTempImages.concat(".pwignore/tempImages/");

    return pathTempImages;
}

export function getAllFilePathOfDir(folderPath: string): string[] {
    let allFilePaths: string[] = [];

    function getAllFiles(recPath: string) {
        let files = fs.readdirSync(recPath);
        files.forEach(element => {
            if (fs.lstatSync(recPath + element).isDirectory()) {
                getAllFiles(recPath + element + "/");
            } else {
                allFilePaths.push(recPath + element);
            }
        });
    }

    getAllFiles(folderPath);

    return allFilePaths;
}
export function getAllFilePath(): WikiElement[] {
    let pathJSON: WikiConfig = JSON.parse(getPWConfigJSON());
    let allFiles: WikiElement[] = [];

    function getAllFiles(recElement: WikiElement) {
        recElement.elementChildren.forEach(element => {
            if (element.isDirectory) {
                getAllFiles(element);
            } else {
                allFiles.push(element);
            }
        });
    }
    getAllFiles(pathJSON.element);
    return allFiles;
}
export function getFileName(filePath: string, withType: boolean): string {
    filePath = filePath.substring(filePath.lastIndexOf("/") + 1, filePath.length);
    if (withType) {
        return filePath;
    } else {
        filePath = filePath.substring(0, filePath.lastIndexOf("."));
        return filePath;
    }
}
export function getFolderName(folderpath: string): string {
    return folderpath.substring(folderpath.substring(0, folderpath.length - 1).lastIndexOf("/") + 1, folderpath.length);
}
export function getFolderOfFile(filePath: string): string {
    let folderPath = filePath.substring(0, filePath.lastIndexOf("/") + 1);
    return folderPath;
}
export function getContentOfFile(path: string): string {
    let content = fs.readFileSync(path, 'utf8');;
    return content;
}

export function isPartOfPersonalWiki(checkPath: string): boolean {
    if (checkPath.substring(0, getPWPath().length).toLowerCase() === getPWPath().toLowerCase()) {
        return true;
    } else {
        return false;
    }
}
export function isRootDirOfPersonalWiki(path: string): boolean {
    if (fs.readdirSync(path).includes(".pwignore")) {
        return true;
    } else {
        return false;
    }
}
export function isInWorkspace(path: string): boolean {
    let wpArray = vscode.workspace.workspaceFolders;
    let inWorkspace = false;

    wpArray?.forEach(element => {
        let wp = element.uri.path.substring(1, element.uri.path.length).toLowerCase();
        if (wp === path.substring(0, wp.length).toLowerCase()) {
            inWorkspace = true;
        }
    });

    return inWorkspace;
}
export function isSubFolder(folder: string, subFolder: string): boolean {
    if (!isFolder(folder)) {
        folder = getFolderOfFile(folder);
    }

    let subStruct = subFolder.substring(folder.length, subFolder.length);

    if (folder.toLowerCase() === subFolder.substring(0, folder.length).toLowerCase() && fs.existsSync(folder.concat(subStruct))) {
        return true;
    } else {
        return false;
    }
}
export function isFolder(path: string): boolean {
    if (fs.lstatSync(path).isDirectory()) {
        return true;
    } else {
        return false;
    }
}

export function copyExternImage(imgPath: string) {
    if (!isInWorkspace(imgPath)) {
        let filename = getFileName(imgPath, true);

        if (!fs.existsSync(getTempImagePath().concat(filename))) {
            fs.copyFileSync(imgPath, getTempImagePath().concat(filename));
            return getTempImagePath().concat(filename);
        } else {
            let i = 0;
            let fname = filename.substring(0, filename.lastIndexOf("."));
            let fext = filename.substring(filename.lastIndexOf("."), filename.length);

            while (i < 100) {
                if (fs.existsSync(getTempImagePath().concat(fname + "_" + i + fext))) {
                    i++;
                } else {
                    fs.copyFileSync(imgPath, getTempImagePath().concat(fname + "_" + i + fext));
                    return getTempImagePath().concat(fname + "_" + i + fext);
                }
            }
        }
    } else {
        return imgPath;
    }
}
export function moveWikiItem(oldPath: string, newPath: string) {
    return Promise.resolve(fs.renameSync(oldPath, newPath));
}

export function pwCreatePage(pageName: string, path: string, wikiPath: string, isChildPage: boolean) {
    if (isPartOfPersonalWiki(path)) {
        if (!isChildPage) {
            if (fs.existsSync(path + pageName + ".md") !== true) {
                fs.writeFile(path + pageName + ".md", template.getTemplateContent(template.getDefaultTemp()), 'utf8', (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
            } else {
                vscode.window.showInformationMessage("Wikipage already exists!");
            }
        } else {
            let childDir = path.substring(0, path.lastIndexOf(".")) + "/";
            if (fs.existsSync(childDir) !== true) {
                fs.mkdir(childDir, { recursive: true }, (err) => {
                    if (err) {
                        return;
                    }
                    fs.writeFile(childDir + pageName + ".md", template.getTemplateContent(template.getDefaultTemp()), 'utf8', (err) => {
                        if (err) {
                            return;
                        }
                    });
                });
            } else if (fs.existsSync(childDir + pageName + ".md") !== true) {
                fs.writeFile(childDir + pageName + ".md", template.getTemplateContent(template.getDefaultTemp()), 'utf8', (err) => {
                    if (err) {
                        return;
                    }
                });
            } else {
                vscode.window.showInformationMessage("Wikipage already exists!");
            }
        }
    } else {
        vscode.window.showInformationMessage("Not part of Personal Wiki");
    }
}
export function pwCreateFolder(foldername: string, path: string) {
    if (fs.lstatSync(path) !== undefined && !fs.existsSync(path + "/" + foldername)) {
        fs.mkdirSync(path + "/" + foldername);
    }
}

function updateWikiFile(path: string, content: string) {
    fs.writeFile(path, content, (err) => {
        if (err) {
            console.log(err);
        }
    });
}