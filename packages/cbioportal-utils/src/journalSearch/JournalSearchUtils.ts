import { IJournalSearch, IJournalSearchData } from '../model/JournalSearch';
import { Mutation } from '../model/Mutation';

export function getJournalSearch(
    mutation: Partial<Mutation>,
    journalSearchData: IJournalSearchData
): IJournalSearch[] {
    const journalSearches: IJournalSearch[] | undefined =
        mutation.gene && mutation.gene.hugoGeneSymbol
            ? journalSearchData[mutation.gene.hugoGeneSymbol]
            : undefined;

    return journalSearches as IJournalSearch[];
}
