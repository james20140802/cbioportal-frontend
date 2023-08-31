import { observer } from 'mobx-react';
import * as React from 'react';

import journalSearchLogoSrc from '../../images/journal-search.svg';

import annotationStyles from '../column/annotation.module.scss';
import { makeObservable, observable } from 'mobx';
import { errorIcon, loaderIcon } from '../StatusHelpers';
import { IJournalSearch } from 'cbioportal-utils';
import { DefaultTooltip } from 'cbioportal-frontend-commons';
import { placeArrow } from '../myCancerGenome/MyCancerGenome';
import journalSearchStyles from './journalSearch.module.scss';
import { hideArrow } from '../civic/Civic';

export interface IJournalSearchProps {
    journalSearchStatus: 'pending' | 'error' | 'complete';
    journalSearch: IJournalSearch[] | null | undefined;
}

export function journalSearchLinks(journalSearches: IJournalSearch[]) {
    const links: any[] = [];
    journalSearches.forEach((search, index) => {
        links.push(
            <li key={index}>
                <a href={search.linkHTML} target="_blank">
                    {search.author} <i>{search.title}</i>
                </a>
            </li>
        );
    });

    return (
        <span>
            <b>Journals related to {journalSearches[0].hugoGeneSymbol}:</b>
            <br />
            <ul className={journalSearchStyles['link-list']}>{links}</ul>
        </span>
    );
}

@observer
export default class JournalSearch extends React.Component<
    IJournalSearchProps,
    {}
> {
    @observable tooltipDataLoadComplete: boolean = false;

    constructor(props: IJournalSearchProps) {
        super(props);

        makeObservable(this);
    }

    public render() {
        let journalSearchContent: JSX.Element = (
            <span className={`${annotationStyles['annotation-item']}`} />
        );

        const journalSearchImgWidth: number = 14;
        let journalSearchImgHeight: number = 14;
        let journalSearchImgSrc = journalSearchLogoSrc;

        if (this.props.journalSearchStatus == 'error') {
            journalSearchContent = errorIcon('Error fetching journal data');
        } else if (this.props.journalSearchStatus == 'complete') {
            if (
                this.props.journalSearch !== null &&
                this.props.journalSearch !== undefined
            ) {
                const arrowContent = <div className="rc-tooltip-arrow-inner" />;
                const toolttipContent = journalSearchLinks(
                    this.props.journalSearch
                );
                journalSearchContent = (
                    <span className={`${annotationStyles['annotation-item']}`}>
                        <img
                            width={journalSearchImgWidth}
                            height={journalSearchImgHeight}
                            src={journalSearchImgSrc}
                            alt="Journal Search Result"
                        />
                    </span>
                );

                journalSearchContent = (
                    <DefaultTooltip
                        overlay={toolttipContent}
                        placement="right"
                        trigger={['hover', 'focus']}
                        onPopupAlign={hideArrow}
                        destroyTooltipOnHide={false}
                    >
                        {journalSearchContent}
                    </DefaultTooltip>
                );
            }
        } else {
            journalSearchContent = loaderIcon('pull-left');
        }

        return journalSearchContent;
    }
}
