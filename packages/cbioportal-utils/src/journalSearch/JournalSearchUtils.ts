import { IJournalSearch, IJournalSearchData } from '../model/JournalSearch';
import { Mutation } from '../model/Mutation';

export function getJournalSearch(
    mutation: Partial<Mutation>,
    journalSearchData: IJournalSearchData
): IJournalSearch[] | null {
    const journalSearches: IJournalSearch[] | null =
        mutation.gene && mutation.gene.hugoGeneSymbol
            ? journalSearchData[mutation.gene.hugoGeneSymbol]
            : null;

    return journalSearches;
}
