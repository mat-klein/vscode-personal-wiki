import * as fs from 'fs';
import * as yaml from 'yaml';
import * as vscode from 'vscode';

import * as pwFS from './filesystem';

interface TagJSON {
    pwTagIdentifier: string;
    pwSubscribedTags: string;
    pwTags: PersonalWikiTags[];
}
interface PersonalWikiTags {
    path: string;
    tag: string[];
}

export function initDefaultTag(path: string) {
    let defaultTag: PersonalWikiTags = { path: path, tag: ["default"] };
    let newTags: TagJSON = { pwTagIdentifier: "## Wikipage Tags", pwSubscribedTags: "[default]", pwTags: [defaultTag] };

    return newTags;
}

function getTagsOfFile(path: string): string[] {
    let content = "";
    let tags: string[] = [];

    if (fs.existsSync(path)) {
        content = fs.readFileSync(path, "utf8");
    }
    
    yaml.parseAllDocuments(content).forEach(doc => {
        if(doc.has('wikitags')){
            tags = doc.get('wikitags');
        }
    });
    
    return tags;
}
export function getWikifilesWithSub(subscriptionTags: string): string[] {
    let tagJSON: TagJSON = JSON.parse(pwFS.getPWTagJSON());
    let subTags: string[] = [];
    let filePaths: string[] = [];

    if (subscriptionTags.indexOf("[") !== -1) {
        subscriptionTags = subscriptionTags.substring(1, subscriptionTags.length - 1);
        while (subscriptionTags.length > 0) {
            if (subscriptionTags.indexOf("|") !== -1) {
                subTags.push(subscriptionTags.substring(0, subscriptionTags.indexOf("|")));
                subscriptionTags = subscriptionTags.substring(subscriptionTags.indexOf("|") + 1, subscriptionTags.length)
            } else {
                subTags.push(subscriptionTags);
                subscriptionTags = "";
            }
        }
    } else {
        subTags.push(subscriptionTags);
    }

    let includesAllTags: string[] = [];
    tagJSON.pwTags.forEach(ele => {
        subTags.forEach(subTag => {
            if (ele.tag.includes(subTag)) {
                includesAllTags.push(subTag);
            }
        });
        if (arraysEqual(includesAllTags, subTags)) {
            filePaths.push(ele.path);
        }
        includesAllTags = [];
    });
    return filePaths;
}
export function getTagSubscribtions(tags: string): string[] {
    let tagList: string[] = [];
    let currentTags = "";


    while (tags.length > 0) {
        currentTags = tags.substring(0, tags.indexOf("]") + 1);
        tags = tags.substring(tags.indexOf("]") + 1, tags.length);

        tagList.push(currentTags);
    }

    return tagList;
}

export async function addNewSubscription(tags: string) {
    let oldTags = String(vscode.workspace.getConfiguration('personalwiki.general').get("wikiTags"));
    let newTagJSON: TagJSON = JSON.parse(pwFS.getPWTagJSON());

    tags = tags.replace(/\s+/g, '');

    while (tags.includes('||')) {
        tags = tags.replace('||', '|');
    }
    tags = tags.replace(/^\|/, '');
    tags = tags.replace(/\|$/, '');

    oldTags = oldTags + "[" + tags.toLowerCase() + "]";
    oldTags = sortSubscribedTags(getTagSubscribtions(oldTags));

    newTagJSON.pwSubscribedTags = oldTags;
    await promUpdateJSON(newTagJSON);
    await promUpdateSubscriptions(oldTags);

    vscode.commands.executeCommand('pw.RefreshTagView');
}
export async function deleteSubscription(tags: string) {
    let subscriptionTags: string[] = getTagSubscribtions(String(vscode.workspace.getConfiguration('personalwiki.general').get('wikiTags')));
    let newTagJSON: TagJSON = JSON.parse(pwFS.getPWTagJSON());
    let newSubTags: string[] = [];

    subscriptionTags.forEach((element) => {

        element = element.replace('[', '').replace(']', '');
        if (!arraysEqual(convertTagStrToTagArr(element), convertTagStrToTagArr(tags))) {
            newSubTags.push('[' + element + ']');
        }
    });

    newTagJSON.pwSubscribedTags = newSubTags.toString().replace(/,/g, '');
    await promUpdateJSON(newTagJSON);
    await promUpdateSubscriptions(newSubTags.toString().replace(/,/g, ''));

    vscode.commands.executeCommand('pw.RefreshTagView');
}
export async function updateTagsOfWikipage(path: string) {
    let fileTags = getTagsOfFile(path);
    let pwTagJSON = pwFS.getPWTagJSON();
    let tagJSON: TagJSON = JSON.parse(pwTagJSON);
    let updateNecessary = false;
    let existsInTagJSON = false;

    tagJSON.pwTags.forEach((element) => {
        if (!existsInTagJSON) {
            existsInTagJSON = element.path.toLowerCase().includes(path.toLowerCase());
        }
        if (element.path.toLowerCase() === path.toLowerCase() && element.tag.length === fileTags.length) {
            element.tag.forEach((e: string, i: number) => {
                if (fileTags[i] !== e) {
                    element.tag = fileTags;
                    updateNecessary = true;
                }
            });
        } else if (element.path.toLowerCase() === path.toLowerCase()) {
            element.tag = fileTags;
            updateNecessary = true;
        }
    });

    if (!existsInTagJSON) {
        tagJSON.pwTags.push({ path: path, tag: fileTags });
        updateNecessary = true;
    }

    if (updateNecessary) {
        await promUpdateJSON(tagJSON);
        vscode.commands.executeCommand("pw.RefreshTagView");
    }
}
export async function updateTagPath(path: string, newPath: string) {
    let tagJSON: TagJSON = JSON.parse(pwFS.getPWTagJSON());
    let updateNecessary = false;

    tagJSON.pwTags.forEach(element => {
        if (element.path.toLowerCase() === path.toLowerCase()) {
            element.path = newPath;
            updateNecessary = true;
        }
    });

    if(updateNecessary){
        await promUpdateJSON(tagJSON);
        vscode.commands.executeCommand("pw.RefreshTagView");
    }
}
export function deleteFileFromTagJSON(path: string) {
    let pwTagJSON = pwFS.getPWTagJSON();
    let tagJSON: TagJSON = JSON.parse(pwTagJSON);
    let newTags: PersonalWikiTags[] = [];

    tagJSON.pwTags.forEach((element) => {
        if (element.path.toLowerCase() !== path.toLocaleLowerCase()) {
            newTags.push(element);
        }
    });
    tagJSON.pwTags = newTags;

    promUpdateJSON(tagJSON);
}

export async function updateTagIdentifier(newTagID: string) {
    let tagJSON: TagJSON = JSON.parse(pwFS.getPWTagJSON());
    tagJSON.pwTagIdentifier = newTagID;
    tagJSON.pwSubscribedTags = "";
    tagJSON.pwTags = [];

    pwFS.updatePWTagJSON(JSON.stringify(tagJSON, undefined, 2));
    await promUpdateTagIdentifier(newTagID);
    await promUpdateSubscriptions("");
}
export async function updateTagConfig() {
    let tagJSON: TagJSON = JSON.parse(pwFS.getPWTagJSON());

    await promUpdateTagIdentifier(tagJSON.pwTagIdentifier);
    await promUpdateSubscriptions(tagJSON.pwSubscribedTags);
}

function convertTagStrToTagArr(tags: string): string[] {
    let tagArr: string[] = [];

    while (tags.length > 0) {
        if (tags.includes('|')) {
            tagArr.push(tags.substring(0, tags.indexOf('|')));
            tags = tags.substring(tags.indexOf('|') + 1, tags.length);
        } else {
            tagArr.push(tags.substring(0, tags.length));
            tags = "";
        }
    }
    return [...new Set(tagArr)];
}

function arraysEqual(_arr1: any[], _arr2: any[]) {

    if (!Array.isArray(_arr1) || !Array.isArray(_arr2) || _arr1.length !== _arr2.length)
        return false;

    var arr1 = _arr1.concat().sort();
    var arr2 = _arr2.concat().sort();

    for (var i = 0; i < arr1.length; i++) {

        if (arr1[i] !== arr2[i])
            return false;

    }

    return true;
}
function promUpdateSubscriptions(subs: string) {
    return Promise.resolve(vscode.workspace.getConfiguration('personalwiki.general').update('wikiTags', subs, vscode.ConfigurationTarget.Global));
}
function promUpdateTagIdentifier(tagID: string) {
    return Promise.resolve(vscode.workspace.getConfiguration('personalwiki.general').update('pageTagIdentifier', tagID, vscode.ConfigurationTarget.Global));
}
function promUpdateJSON(json: TagJSON) {
    return Promise.resolve(pwFS.updatePWTagJSON(JSON.stringify(json, undefined, 2)));
}
function sortSubscribedTags(tags: string[]): string {
    tags.forEach((element, index) => {
        tags[index] = element.substring(1, element.length - 1);
    });
    tags.sort();
    tags.forEach((element, index) => {
        tags[index] = "[" + element + "]";
    });

    return tags.toString().split(',').join('');
}