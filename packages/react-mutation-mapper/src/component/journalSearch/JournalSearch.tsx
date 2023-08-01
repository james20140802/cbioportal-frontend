import { observer } from 'mobx-react';
import * as React from 'react';

import journalSearchLogoSrc from '../../images/journal-search.svg';

import annotationStyles from '../column/annotation.module.scss';
import { makeObservable, observable } from 'mobx';
import { errorIcon, loaderIcon } from '../StatusHelpers';
import { IJournalSearch } from 'cbioportal-utils';

export interface IJournalSearchProps {
    journalSearchStatus: 'pending' | 'error' | 'complete';
    journalSearch: IJournalSearch[];
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
        } else if (this.props.journalSearch !== undefined) {
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
        } else {
            journalSearchContent = loaderIcon('pull-left');
        }

        return journalSearchContent;
    }
}
