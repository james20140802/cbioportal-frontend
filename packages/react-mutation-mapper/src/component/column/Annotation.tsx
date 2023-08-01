import {
    getCivicEntry,
    getMyCancerGenomeLinks,
    getRemoteDataGroupStatus,
    getVariantAnnotation,
    ICivicEntry,
    ICivicGeneIndex,
    ICivicVariantIndex,
    IHotspotIndex,
    IJournalSearchData,
    IMyCancerGenomeData,
    IOncoKbData,
    is3dHotspot,
    isLinearClusterHotspot,
    MobxCache,
    Mutation,
    OncoKbCardDataType,
    RemoteData,
} from 'cbioportal-utils';
import { CancerGene, IndicatorQueryResp } from 'oncokb-ts-api-client';
import _ from 'lodash';
import { observer } from 'mobx-react';
import * as React from 'react';

import {
    getIndicatorData,
    calculateOncoKbAvailableDataType,
} from 'oncokb-frontend-commons';
import { defaultArraySortMethod } from 'cbioportal-utils';
import Civic, { sortValue as civicSortValue } from '../civic/Civic';
import MyCancerGenome, {
    sortValue as myCancerGenomeSortValue,
} from '../myCancerGenome/MyCancerGenome';
import {
    OncoKB,
    oncoKbAnnotationSortValue as oncoKbSortValue,
} from 'oncokb-frontend-commons';
import HotspotAnnotation, {
    sortValue as hotspotSortValue,
} from './HotspotAnnotation';
import { USE_DEFAULT_PUBLIC_INSTANCE_FOR_ONCOKB } from '../../util/DataFetcherUtils';
import { CanonicalMutationType } from 'cbioportal-frontend-commons';
import { VariantAnnotation, Vues as VUE } from 'genome-nexus-ts-api-client';
import { RevueCell, sortValue as revueSortValue } from '../revue/Revue';
import annotationStyles from './annotation.module.scss';

export type AnnotationProps = {
    mutation?: Mutation;
    enableOncoKb: boolean;
    enableMyCancerGenome: boolean;
    enableHotspot: boolean;
    enableCivic: boolean;
    enableRevue: boolean;
    enableJournalSearch: boolean;
    hotspotData?: RemoteData<IHotspotIndex | undefined>;
    oncoKbData?: RemoteData<IOncoKbData | Error | undefined>;
    journalSearchData?: RemoteData<IJournalSearchData | undefined>;
    oncoKbCancerGenes?: RemoteData<CancerGene[] | Error | undefined>;
    usingPublicOncoKbInstance: boolean;
    mergeOncoKbIcons?: boolean;
    oncoKbContentPadding?: number;
    pubMedCache?: MobxCache;
    resolveEntrezGeneId?: (mutation: Mutation) => number;
    resolveTumorType?: (mutation: Mutation) => string;
    myCancerGenomeData?: IMyCancerGenomeData;
    civicGenes?: RemoteData<ICivicGeneIndex | undefined>;
    civicVariants?: RemoteData<ICivicVariantIndex | undefined>;
    indexedVariantAnnotations?: RemoteData<
        { [genomicLocation: string]: VariantAnnotation } | undefined
    >;
    userDisplayName?: string;
    hasMultipleCancerTypes?: boolean;
};

export type GenericAnnotationProps = {
    annotation: IAnnotation;
    enableCivic: boolean;
    enableHotspot: boolean;
    enableMyCancerGenome: boolean;
    enableOncoKb: boolean;
    enableRevue: boolean;
    mergeOncoKbIcons?: boolean;
    oncoKbContentPadding?: number;
    pubMedCache?: MobxCache;
    userDisplayName?: string;
    hasMultipleCancerTypes?: boolean;
};

export interface IAnnotation {
    isHotspot: boolean;
    is3dHotspot: boolean;
    hotspotStatus: 'pending' | 'error' | 'complete';
    oncoKbIndicator?: IndicatorQueryResp;
    oncoKbAvailableDataTypes: OncoKbCardDataType[];
    oncoKbStatus: 'pending' | 'error' | 'complete';
    oncoKbGeneExist: boolean;
    isOncoKbCancerGene: boolean;
    usingPublicOncoKbInstance: boolean;
    myCancerGenomeLinks: string[];
    civicEntry?: ICivicEntry | null;
    civicStatus: 'pending' | 'error' | 'complete';
    hasCivicVariants: boolean;
    journalSearchStatus: 'pending' | 'error' | 'complete';
    hugoGeneSymbol: string;
    vue?: VUE;
}

export const DEFAULT_ANNOTATION_DATA: IAnnotation = {
    oncoKbStatus: 'complete',
    oncoKbGeneExist: false,
    isOncoKbCancerGene: false,
    oncoKbAvailableDataTypes: [],
    usingPublicOncoKbInstance: false,
    isHotspot: false,
    is3dHotspot: false,
    hotspotStatus: 'complete',
    hugoGeneSymbol: '',
    hasCivicVariants: true,
    myCancerGenomeLinks: [],
    civicStatus: 'complete',
    journalSearchStatus: 'complete',
};

function getDefaultEntrezGeneId(mutation: Mutation): number {
    return (mutation.gene && mutation.gene.entrezGeneId) || 0;
}

function getDefaultTumorType(): string {
    return '';
}

const memoized: Map<string, IAnnotation> = new Map();
export function getAnnotationData(
    mutation?: Mutation,
    oncoKbCancerGenes?: RemoteData<CancerGene[] | Error | undefined>,
    hotspotData?: RemoteData<IHotspotIndex | undefined>,
    myCancerGenomeData?: IMyCancerGenomeData,
    oncoKbData?: RemoteData<IOncoKbData | Error | undefined>,
    usingPublicOncoKbInstance?: boolean,
    civicGenes?: RemoteData<ICivicGeneIndex | undefined>,
    civicVariants?: RemoteData<ICivicVariantIndex | undefined>,
    indexedVariantAnnotations?: RemoteData<
        { [genomicLocation: string]: VariantAnnotation } | undefined
    >,
    journalSearchData?: RemoteData<IJournalSearchData | undefined>,
    resolveTumorType: (mutation: Mutation) => string = getDefaultTumorType,
    resolveEntrezGeneId: (mutation: Mutation) => number = getDefaultEntrezGeneId
): IAnnotation {
    let value: Partial<IAnnotation>;

    if (mutation) {
        let key = '';
        const memoize =
            oncoKbCancerGenes?.isComplete &&
            hotspotData?.isComplete &&
            !!myCancerGenomeData &&
            oncoKbData?.isComplete &&
            civicGenes?.isComplete &&
            civicVariants?.isComplete &&
            journalSearchData?.isComplete &&
            indexedVariantAnnotations?.isComplete;

        if (memoize) {
            key = JSON.stringify(mutation) + !!usingPublicOncoKbInstance;
            const val = memoized.get(key);
            if (val) {
                return val;
            }
        }

        const entrezGeneId = resolveEntrezGeneId(mutation);

        let oncoKbIndicator: IndicatorQueryResp | undefined;
        const hugoGeneSymbol = mutation.gene
            ? mutation.gene.hugoGeneSymbol
            : undefined;

        let oncoKbGeneExist = false;
        let isOncoKbCancerGene = false;
        if (oncoKbCancerGenes && !(oncoKbCancerGenes.result instanceof Error)) {
            oncoKbGeneExist =
                _.find(
                    oncoKbCancerGenes.result,
                    (gene: CancerGene) =>
                        (mutation.mutationType &&
                            mutation.mutationType.toLowerCase() ===
                                CanonicalMutationType.FUSION) ||
                        (gene.oncokbAnnotated &&
                            gene.entrezGeneId === entrezGeneId)
                ) !== undefined;
            isOncoKbCancerGene =
                _.find(
                    oncoKbCancerGenes.result,
                    (gene: CancerGene) => gene.entrezGeneId === entrezGeneId
                ) !== undefined;
        }

        value = {
            hugoGeneSymbol,
            oncoKbGeneExist,
            isOncoKbCancerGene,
            usingPublicOncoKbInstance: usingPublicOncoKbInstance
                ? usingPublicOncoKbInstance
                : USE_DEFAULT_PUBLIC_INSTANCE_FOR_ONCOKB,
            civicEntry:
                civicGenes &&
                civicGenes.result &&
                civicVariants &&
                civicVariants.result
                    ? getCivicEntry(
                          mutation,
                          civicGenes.result,
                          civicVariants.result
                      )
                    : undefined,
            civicStatus:
                civicGenes &&
                civicGenes.status &&
                civicVariants &&
                civicVariants.status
                    ? getRemoteDataGroupStatus(civicGenes, civicVariants)
                    : 'pending',
            hasCivicVariants: true,
            myCancerGenomeLinks: myCancerGenomeData
                ? getMyCancerGenomeLinks(mutation, myCancerGenomeData)
                : [],
            isHotspot:
                hotspotData?.isComplete && hotspotData.result
                    ? isLinearClusterHotspot(mutation, hotspotData.result)
                    : false,
            is3dHotspot:
                hotspotData?.isComplete && hotspotData.result
                    ? is3dHotspot(mutation, hotspotData.result)
                    : false,
            hotspotStatus: hotspotData ? hotspotData.status : 'pending',
            vue:
                indexedVariantAnnotations?.isComplete &&
                indexedVariantAnnotations.result
                    ? getVariantAnnotation(
                          mutation,
                          indexedVariantAnnotations.result
                      )?.annotation_summary?.vues
                    : undefined,
            journalSearchStatus: journalSearchData
                ? journalSearchData.status
                : 'pending',
        };

        // oncoKbData may exist but it might be an instance of Error, in that case we flag the status as error
        if (oncoKbData && oncoKbData.result instanceof Error) {
            value = {
                ...value,
                oncoKbStatus: 'error',
                oncoKbIndicator: undefined,
            };
        } else if (oncoKbGeneExist) {
            // actually, oncoKbData.result shouldn't be an instance of Error in this case (we already check it above),
            // but we need to check it again in order to avoid TS errors/warnings

            // Always show oncogenicity icon even when the indicatorMapResult is empty.
            // We want to show an icon for genes that haven't been annotated by OncoKB
            let oncoKbAvailableDataTypes: OncoKbCardDataType[] = [
                OncoKbCardDataType.BIOLOGICAL,
            ];
            if (
                oncoKbData &&
                oncoKbData.result &&
                !(oncoKbData.result instanceof Error) &&
                oncoKbData.status === 'complete'
            ) {
                oncoKbIndicator = getIndicatorData(
                    mutation,
                    oncoKbData.result,
                    resolveTumorType,
                    resolveEntrezGeneId
                );
                oncoKbAvailableDataTypes = _.uniq([
                    ...oncoKbAvailableDataTypes,
                    ...calculateOncoKbAvailableDataType(
                        _.values(oncoKbData.result.indicatorMap)
                    ),
                ]);
            }

            value = {
                ...value,
                oncoKbStatus: oncoKbData ? oncoKbData.status : 'pending',
                oncoKbIndicator,
                oncoKbAvailableDataTypes,
            };
        } else if (oncoKbData && oncoKbData.isPending) {
            value = {
                ...value,
                oncoKbStatus: 'pending',
                oncoKbIndicator: undefined,
            };
        } else {
            value = {
                ...value,
                oncoKbStatus: 'complete',
                oncoKbIndicator: undefined,
            };
        }
        if (memoize) {
            memoized.set(key, value as any);
        }
    } else {
        value = DEFAULT_ANNOTATION_DATA;
    }

    return value as IAnnotation;
}

export function annotationSortMethod(a: IAnnotation, b: IAnnotation) {
    return defaultArraySortMethod(sortValue(a), sortValue(b));
}

export function sortValue(annotation: IAnnotation): number[] {
    return _.flatten([
        oncoKbSortValue(annotation.oncoKbIndicator),
        civicSortValue(annotation.civicEntry),
        myCancerGenomeSortValue(annotation.myCancerGenomeLinks),
        hotspotSortValue(annotation.isHotspot, annotation.is3dHotspot),
        revueSortValue(annotation.vue),
        annotation.isOncoKbCancerGene ? 1 : 0,
    ]);
}

export function GenericAnnotation(props: GenericAnnotationProps): JSX.Element {
    const {
        annotation,
        enableCivic,
        enableHotspot,
        enableMyCancerGenome,
        enableOncoKb,
        enableRevue,
        pubMedCache,
        userDisplayName,
        mergeOncoKbIcons,
        oncoKbContentPadding,
        hasMultipleCancerTypes,
    } = props;

    return (
        <span style={{ display: 'flex', minWidth: 100 }}>
            {enableOncoKb && (
                <OncoKB
                    usingPublicOncoKbInstance={
                        annotation.usingPublicOncoKbInstance
                    }
                    hugoGeneSymbol={annotation.hugoGeneSymbol}
                    geneNotExist={!annotation.oncoKbGeneExist}
                    isCancerGene={annotation.isOncoKbCancerGene}
                    status={annotation.oncoKbStatus}
                    indicator={annotation.oncoKbIndicator}
                    availableDataTypes={annotation.oncoKbAvailableDataTypes}
                    mergeAnnotationIcons={mergeOncoKbIcons}
                    userDisplayName={userDisplayName}
                    contentPadding={oncoKbContentPadding}
                    hasMultipleCancerTypes={hasMultipleCancerTypes}
                />
            )}
            {/* only show reVUE when reVUE is enabled and there are reVUE mutations in the query */}
            {enableRevue ? (
                annotation.vue ? (
                    <RevueCell vue={annotation.vue} />
                ) : (
                    <span
                        className={`${annotationStyles['annotation-item']}`}
                    />
                )
            ) : (
                <></>
            )}
            {enableCivic && (
                <Civic
                    civicEntry={annotation.civicEntry}
                    civicStatus={annotation.civicStatus}
                    hasCivicVariants={annotation.hasCivicVariants}
                />
            )}
            {enableMyCancerGenome && (
                <MyCancerGenome linksHTML={annotation.myCancerGenomeLinks} />
            )}
            {enableHotspot && (
                <HotspotAnnotation
                    isHotspot={annotation.isHotspot}
                    is3dHotspot={annotation.is3dHotspot}
                    status={annotation.hotspotStatus}
                />
            )}
        </span>
    );
}

@observer
export default class Annotation extends React.Component<AnnotationProps, {}> {
    public render() {
        const annotation = this.getAnnotationData(this.props);
        return <GenericAnnotation {...this.props} annotation={annotation} />;
    }

    private getAnnotationData(props: AnnotationProps) {
        const {
            mutation,
            oncoKbCancerGenes,
            hotspotData,
            myCancerGenomeData,
            oncoKbData,
            usingPublicOncoKbInstance,
            resolveEntrezGeneId,
            resolveTumorType,
            civicGenes,
            civicVariants,
            indexedVariantAnnotations,
            journalSearchData,
        } = props;

        return getAnnotationData(
            mutation,
            oncoKbCancerGenes,
            hotspotData,
            myCancerGenomeData,
            oncoKbData,
            usingPublicOncoKbInstance,
            civicGenes,
            civicVariants,
            indexedVariantAnnotations,
            journalSearchData,
            resolveTumorType,
            resolveEntrezGeneId
        );
    }
}
