import * as fs from 'fs';

import * as temp from './template';


export function getJournalPath(path: string): string{
    let newPath = path.substring(0, path.indexOf("/pwj_")+5);

    return newPath+getJournalName(path)+"/";
}
export function getJournalName(path: string): string{
    let jorunalName = path.substring(path.indexOf("/pwj_")+5, path.length);

    return jorunalName.substring(0, jorunalName.indexOf("/"));
}

export function isJournalPath(path: string): boolean{
    if(path.includes("/pwj_")){
        return true;
    } else {
        return false;
    }
}

export function createNewJournal(path: string, jorunalName: string){
    fs.mkdirSync(path+"pwj_"+jorunalName);
}
export function createJournalPage(path: string){
    let date = new Date();
    let newPath = getJournalPath(path)+date.getFullYear()+"/"+(date.getMonth()+1)+"/";

    if(!fs.existsSync(newPath) && !fs.existsSync(newPath+date.getDate()+".md")){
        fs.mkdirSync(newPath, { recursive: true });

        fs.writeFileSync(newPath+date.getDate()+".md", temp.getTemplateContent(temp.getDefaultTemp()));
    } else if(!fs.existsSync(newPath+date.getDate()+".md")) {
        fs.writeFileSync(newPath+date.getDate()+".md", temp.getTemplateContent(temp.getDefaultTemp()));
    }
}