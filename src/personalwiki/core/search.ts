import * as tag from '../core/tag';
import * as pwFS from './filesystem';


interface SearchResult {
    resultCount: number;
    filePath: string;
}

export class Search {
    private searchFiles: string[];
    private searchTags: string[];
    private searchContent: string[];

    constructor() {
        this.searchFiles = [];
        this.searchTags = [];
        this.searchContent = [];
    }

    public getSearchFiles(): string[] {
        return this.searchFiles;
    }
    public getSearchTags(): string[] {
        return this.searchTags;
    }
    public getSearchContent(): string[] {
        return this.searchContent;
    }

    public setSearchFiles(searchString: string) {
        let files = pwFS.getAllFilePath();
        let regexp = new RegExp(searchString, "gi");
        let searchRes: string[] = [];

        files.forEach(element => {
            if (regexp.exec(element.elementLabel) !== null) {
                searchRes.push(element.elementPath);
            }
        });

        this.searchFiles = searchRes;
    }
    public setSearchTags(searchString: string) {
        this.searchTags = tag.getWikifilesWithSub(searchString);
    }
    public setSearchContent(searchString: string) {
        let files = pwFS.getAllFilePath();
        let regexp = new RegExp(searchString, "gi");
        let searchRes: SearchResult[] = [];

        files.forEach(element => {
            let content = pwFS.getContentOfFile(element.elementPath);
            let numberOfResults: number[] = [];
            let res;
            while ((res = regexp.exec(content))) {
                numberOfResults.push(res.index);
            }
            if (numberOfResults.length > 0) {
                searchRes.push({ resultCount: numberOfResults.length, filePath: element.elementPath });
            }
        });

        let sortedRes: string[] = [];
        while (searchRes.length > 0) {
            let highestVal = Math.max.apply(Math, searchRes.map(function (o) { return o.resultCount; }));
            let obj = searchRes.find(function (o) { return o.resultCount == highestVal; })
            searchRes.splice(searchRes.findIndex(function (o) { return o.resultCount == highestVal; }), 1);
            if (obj !== undefined) {
                sortedRes.push(obj.filePath);
            }
        }

        this.searchContent = sortedRes;
    }

    public clearSearch() {
        this.searchFiles = [];
        this.searchTags = [];
        this.searchContent = [];
    }
}