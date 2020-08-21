import * as fs from 'fs';
import * as childPro from 'child_process';

import * as pwFS from '../core/filesystem';

export function importMarkdownFiles(path: string, targetPath: string) {
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }

    if (!fs.existsSync(targetPath + pwFS.getFileName(path, true))) {
        fs.copyFileSync(path, targetPath + pwFS.getFileName(path, true));
    }
}

export function exportMarkdownFiles(path: string, targetPath: string, type: string, panOpt: string) {
    let filename = pwFS.getFileName(path, false);

    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }

    switch (type) {
        case "pdf":
            childPro.exec("pandoc " + path + " -s -o " + targetPath + filename + ".pdf " + panOpt);
            break;
        case "html":
            childPro.exec("pandoc " + path + " -s -o " + targetPath + filename + ".html " + panOpt);
            break;
        case "latex":
            childPro.exec("pandoc " + path + " -s -o " + targetPath + filename + ".tex " + panOpt);
            break;
    }
}