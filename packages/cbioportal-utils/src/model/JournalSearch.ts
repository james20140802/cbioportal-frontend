export interface IJournalSearch {
    hugoGeneSymbol: string;
    title: string;
    author: string;
    linkHTML: string;
}
export interface IJournalSearchData {
    [hugoSymbol: string]: IJournalSearch[];
}
