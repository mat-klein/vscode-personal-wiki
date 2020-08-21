import * as vscode from 'vscode';

import * as pwFS from './filesystem'

interface Templates {
    default: string;
    templates: Template[];
}
interface Template {
    templateID: string;
    template: string;
}

export function initDefaultTemplate() {
    let defaultTemp: Template = { templateID: "DefaultTemp", template: "## Wikipage Template\r\n\r\nDescription of Wikipage\r\n\r\n---\r\n\r\n### Wikipage table of content\r\n\r\n[TOC]\r\n\r\n### Wiki Content\r\n\r\nContent of Wikipage\r\n\r\n---\r\n\r\n## Wikipage Tags\r\n\r\n``\r\ndefault\r\n``" };
    let newTemplates: Templates = { default: "DefaultTemp", templates: [defaultTemp] };

    return newTemplates;
}

export function getDefaultTemp(): string {
    let defaultTemp = String(vscode.workspace.getConfiguration('personalwiki.general').get('defaultTemplate'));

    return defaultTemp;
}
export async function setDefaultTemp(tempID: string) {
    if (getDefaultTemp() !== tempID) {
        await promUpdateDefaultTemp(tempID);
    }
}
export async function updateTemplateConfig() {
    let tempJSON: Templates = JSON.parse(pwFS.getPWTemplateJSON());

    await promUpdateDefaultTemp(tempJSON.default);
}

export function isTemplate(tempID: string): boolean {
    let isTemp = false;
    let tempArr = getAllTemplates();

    tempArr.forEach(element => {
        if (element.templateID === tempID) {
            isTemp = true;
        }
    });

    return isTemp;
}
export function getAllTemplates(): Template[] {
    let tempJSON: Templates = JSON.parse(pwFS.getPWTemplateJSON());
    let tempArr: Template[] = []

    tempJSON.templates.forEach(element => {
        tempArr.push(element);
    });

    return tempArr;
}
export function getAllTemplatesID(): string[] {
    let tempIDs: string[] = [];
    let tempArr = getAllTemplates();

    tempArr.forEach(element => {
        tempIDs.push(element.templateID);
    });

    return tempIDs;
}

export function addNewTemplate(newTempID: string, newTempContent: string) {
    if (!isTemplate(newTempID)) {
        let tempArr = getAllTemplates();
        tempArr.push({ templateID: newTempID, template: newTempContent });
        pwFS.updatePWTemplateJSON(JSON.stringify({ templates: tempArr }, undefined, 2));
    }
}
export function deleteTemplate(tempID: string) {
    if (isTemplate(tempID)) {
        let newTemp: Templates;
        if (vscode.workspace.getConfiguration('personalwiki.general').get('defaultTemplate') === tempID) {
            newTemp = { default: "", templates: getAllTemplates() };
            setDefaultTemp("");
        } else {
            newTemp = { default: String(vscode.workspace.getConfiguration('personalwiki.general').get('defaultTemplate')), templates: getAllTemplates() };
        }

        newTemp.templates.forEach((element, index) => {
            if (element.templateID === tempID) {
                newTemp.templates.splice(index, 1);
            }
        });

        pwFS.updatePWTemplateJSON(JSON.stringify(newTemp, undefined, 2));
    }
}
export function getTemplateContent(tempID: string): string {
    let content = "";

    if (isTemplate(tempID)) {
        let tempArr = getAllTemplates();

        tempArr.forEach(element => {
            if (element.templateID === tempID) {
                content = element.template;
            }
        });
    }

    return content;
}

function promUpdateDefaultTemp(newDefaultTemp: string) {
    return Promise.resolve(vscode.workspace.getConfiguration('personalwiki.general').update('defaultTemplate', newDefaultTemp, vscode.ConfigurationTarget.Global));
};