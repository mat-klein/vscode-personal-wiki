import * as fs from 'fs';
import * as path from 'path';

import * as pwFS from './filesystem';
import { Color } from 'vscode';

interface Linklist {
    links: Links[];
}
interface Links {
    filepath: string;
    wiki: string[];
    workspace: string[];
    external: string[];
}

export function initDefaultLink() {
    let linklist: Linklist = { links: [] };

    return linklist;
}

export function isHTTPLink(path: string): boolean {
    const regExp = new RegExp(/http:\/\//);

    if (path.match(regExp) !== null) {
        return true;
    } else {
        return false;
    }
}
export function isWikiLink(path: string): boolean {
    if (pwFS.isPartOfPersonalWiki(path) && fs.existsSync(path)) {
        return true;
    } else {
        return false;
    }
}
export function isWorkspaceLink(path: string) {
    if (pwFS.isInWorkspace(path) && fs.existsSync(path)) {
        return true;
    } else {
        return false;
    }
}

export function mdLinkToPath(mdLink: string): string {
    const regExp = new RegExp(/\]\((.+)\)/);
    let pathLink = mdLink.match(regExp);

    if (pathLink !== null) {
        return pathLink[0].substring(2, pathLink[0].length - 1);
    } else {
        return "";
    }
}
export function pathToMDLink(path: string): string {
    return "[" + pwFS.getFileName(path, false) + "](" + path + ")";
}
export function linkToAbsPath(source: string, link: string): string {
    let absPath = path.resolve(source, link).replace(/\\/g, "/");

    return absPath;
}

export function getLinklistElement(): Linklist {
    return JSON.parse(pwFS.getPWLinkJSON());
}
export function getAllLinkElements(): Links[] {
    let linkJSON: Linklist = JSON.parse(pwFS.getPWLinkJSON());

    return linkJSON.links;
}
export function getAllWikiLinksOfPath(path: string): string[] {
    let links: string[] = [];
    pwFS.getAllFilePath().forEach(element => {
        if (element.elementPath !== path) {
            links.push(element.elementPath);
        }
    });
    return links;
}
export function getLinksOfContent(content: string) {
    const regExp = new RegExp(/(^\[.+\]\(.+\))|(.\[.+\]\(.+\))/gm);
    let allLinks: string[] = [];
    let fileLinks;

    fileLinks = content.match(regExp);

    fileLinks?.forEach((link, index) => {
        if (link.startsWith("[") && !isHTTPLink(link)) {
            allLinks.push(mdLinkToPath(link));
        } else if (!link.startsWith("!") && !isHTTPLink(link)) {
            allLinks.push(mdLinkToPath(link.substring(1, link.length)));
        }
    });

    return allLinks;
}

export function addNewLinksToFile(fsPath: string, links: string[]) {
    let newLinklist: Linklist = getLinklistElement();
    let addedLinks: boolean = false;

    newLinklist.links.forEach(linkElement => {
        if (linkElement.filepath.toLowerCase() === fsPath.toLowerCase()) {
            addedLinks = true;
            linkElement.wiki = [];
            linkElement.workspace = [];
            linkElement.external = [];
            links.forEach(link => {
                if (isWikiLink(linkToAbsPath(pwFS.getFolderOfFile(fsPath), link)) && !linkElement.wiki.includes(link)) {
                    linkElement.wiki.push(link);
                } else if (isWorkspaceLink(linkToAbsPath(pwFS.getFolderOfFile(fsPath), link)) && !linkElement.workspace.includes(link)) {
                    linkElement.workspace.push(link);
                } else if (!linkElement.external.includes(link)) {
                    linkElement.external.push(link);
                }
            });
        }
    });

    if (!addedLinks) {
        let newLink: Links = { filepath: fsPath, wiki: [], workspace: [], external: [] };
        links.forEach(link => {
            if (isWikiLink(linkToAbsPath(pwFS.getFolderOfFile(fsPath), link))) {
                newLink.wiki.push(link);
            } else if (isWorkspaceLink(linkToAbsPath(pwFS.getFolderOfFile(fsPath), link))) {
                newLink.workspace.push(link);
            } else {
                newLink.external.push(link);
            }
        });
        newLinklist.links.push(newLink);
    }

    promUpdateJSON(newLinklist);
}
export function updateLinksOfFile(path: string) {
    let pathContent = pwFS.getContentOfFile(path);

    addNewLinksToFile(path, getLinksOfContent(pathContent));
}
export function linkChanged(oldLink: string, newLink: string) {
    let oldLinklist = getLinklistElement();
    let newLinks: string[] = [];

    oldLinklist.links.forEach(element => {
        element.wiki.forEach(wikiLink => {
            if (linkToAbsPath(pwFS.getFolderOfFile(element.filepath), wikiLink).toLowerCase() === oldLink.toLowerCase()) {
                let relPath = path.relative(element.filepath, newLink).replace(/\\/g, "/");
                relPath = relPath.substring(0, relPath.lastIndexOf("/../")).concat("/./" + relPath.substring(relPath.lastIndexOf("/../") + 4, relPath.length));

                if (relPath.startsWith("/")) {
                    relPath = relPath.substring(1, relPath.length);
                }
                newLinks.push(relPath);

                let regExp = new RegExp(wikiLink, 'g');
                let content = pwFS.getContentOfFile(element.filepath);
                content = content.replace(regExp, relPath);
                fs.writeFileSync(element.filepath, content, 'utf8');
            } else {
                newLinks.push(wikiLink);
            }
        });
        element.wiki = newLinks;
        newLinks = [];
    });

    promUpdateJSON(oldLinklist);
}
export function filePathChanged(oldPath: string, newPath: string) {
    let newLinklist = getLinklistElement();
    let newLinks: string[] = [];

    newLinklist.links.forEach((element) => {
        if (element.filepath.toLowerCase() === oldPath.toLowerCase()) {
            element.wiki.forEach((wikiLink) => {
                let relPath = path.relative(newPath, linkToAbsPath(pwFS.getFolderOfFile(oldPath), wikiLink)).replace(/\\/g, "/");
                relPath = relPath.substring(0, relPath.lastIndexOf("/../")).concat("/./" + relPath.substring(relPath.lastIndexOf("/../") + 4, relPath.length));

                if (relPath.startsWith("/")) {
                    relPath = relPath.substring(1, relPath.length);
                }

                newLinks.push(relPath);

                let regExp = new RegExp(wikiLink, 'g');
                let content = pwFS.getContentOfFile(element.filepath);
                content = content.replace(regExp, relPath);
                fs.writeFileSync(element.filepath, content, 'utf8');
            });
            element.filepath = newPath;
            element.wiki = newLinks;
            newLinks = [];
/*
            element.workspace.forEach((wpLink) => {
                let relPath = path.relative(newPath, linkToAbsPath(pwFS.getFolderOfFile(oldPath), wpLink)).replace(/\\/g, "/");
                relPath = relPath.substring(0, relPath.lastIndexOf("/../")).concat("/./" + relPath.substring(relPath.lastIndexOf("/../") + 4, relPath.length));

                if (relPath.startsWith("/")) {
                    relPath = relPath.substring(1, relPath.length);
                }

                newLinks.push(relPath);

                let regExp = new RegExp(wpLink, 'g');
                let content = pwFS.getContentOfFile(element.filepath);
                content = content.replace(regExp, relPath);
                fs.writeFileSync(element.filepath, content, 'utf8');
            });
            element.workspace = newLinks;*/
        }
    });

    promUpdateJSON(newLinklist);
}

function promUpdateJSON(json: Linklist) {
    return Promise.resolve(pwFS.updatePWLinkJSON(JSON.stringify(json, undefined, 2)));
}