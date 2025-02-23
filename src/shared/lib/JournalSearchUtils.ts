import _ from 'lodash';
import { Mutation } from 'cbioportal-ts-api-client';
import { IJournalSearch, IJournalSearchData } from 'cbioportal-utils';

interface IdMap<T> {
    [key: string]: Array<T>;
}

interface IdDataMap {
    [key: string]: Object;
}

const throttledRequest = (baseUrl: string) => {
    let requestCount = 0;

    const fetchRequest = (name: string) =>
        fetch(baseUrl + name, {
            method: 'GET',
        })
            .then(response => {
                console.log(response.status);
                return response.text();
            })
            .catch(err => console.error(err));

    return (names: string[]) => {
        return names.map((name: string) => {
            if (name === '') {
                return '';
            }
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(fetchRequest(name));
                }, 500 * requestCount++);
            });
        });
    };
};

export async function fetchPubmedId(
    geneNames: string[]
): Promise<IdMap<string>> {
    const baseUrl =
        'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=10&term="free full text"[sb]+AND+science[journal]+AND+';

    let idMap: IdMap<string> = {};

    const request = throttledRequest(baseUrl);
    await Promise.all(request(geneNames)).then(data => {
        data.forEach((d, index) => {
            const geneName = geneNames[index];
            idMap[geneName] = [];
            let xml_doc = $.parseXML(d as string);
            $(xml_doc)
                .find('Id')
                .each(function() {
                    idMap[geneName].push($(this).text());
                });
        });
    });

    return idMap;
}

export async function fetchJournalInfo(
    idMap: IdMap<string>,
    geneNames: string[]
) {
    const baseUrl =
        'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?&db=pubmed&retmode=xml&id=';

    const ids = geneNames.map(geneName =>
        idMap[geneName].length > 0 ? idMap[geneName].join(',') : ''
    );

    const idDataMap: IdDataMap = {};
    const map: IJournalSearchData = {};

    await fetch(baseUrl + ids.filter(id => id !== '').join(',')).then(
        async response => {
            let text = await response.text();
            let xml_doc = $.parseXML(text as string);

            $(xml_doc)
                .find('PubmedArticle')
                .each(function() {
                    let temp: string[] = [];
                    $(this)
                        .find('Author')
                        .each(function() {
                            temp.push(
                                $(this)
                                    .find('LastName')
                                    .text() +
                                    '. ' +
                                    $(this)
                                        .find('Initials')
                                        .text()
                            );
                        });
                    let author: string = '';

                    if (temp.length === 1) {
                        author = temp[0];
                    } else if (temp.length === 2) {
                        author = temp.join(' and ');
                    } else if (temp.length >= 3) {
                        author = temp[0] + ' et al.';
                    }

                    const id = $(this)
                        .find('PMID')
                        .first()
                        .text();

                    idDataMap[id] = {
                        title: $(this)
                            .find('ArticleTitle')
                            .text(),
                        author: author,
                    };
                });
        }
    );

    geneNames.forEach(geneName => {
        if (geneName in idMap) {
            let idList = idMap[geneName];
            idList.forEach(id => {
                if (id in idDataMap) {
                    if (!(geneName in map)) {
                        map[geneName] = [];
                    }
                    map[geneName].push({
                        ...idDataMap[id],
                        hugoGeneSymbol: geneName,
                        linkHTML:
                            'https://www.ncbi.nlm.nih.gov/research/pubtator/?view=publication&pmid=' +
                            id,
                    } as IJournalSearch);
                }
            });
        }
    });

    return map;
}

export async function fetchJournalSearchData(
    mutations: Mutation[]
): Promise<IJournalSearchData> {
    let geneNames = mutations.map(mutation => mutation.gene.hugoGeneSymbol);

    geneNames = _.uniq(geneNames);

    const idMap = await fetchPubmedId(geneNames);

    const data = await new Promise(resolve => {
        setTimeout(async () => {
            console.log('waiting...');
            resolve(await fetchJournalInfo(idMap, geneNames));
        }, 1750);
    });

    return data as IJournalSearchData;
}
