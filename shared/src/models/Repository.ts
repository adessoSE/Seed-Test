import { AiConfig } from './RepositoryContainer';
import { Group } from './Group';

export interface Repository {
    _id?: any;
    owner: any;
    repoName: string;
    stories: any[];
    repoType: 'db' | 'github' | 'jira';
    customBlocks?: any[];
    groups: Group[];
    settings?: {
        stepWaitTime?: number;
        reportComment?: boolean;
        browser?: string;
        testRunner?: string;
        emulator?: string;
        width?: number;
        height?: number;
        activated?: boolean;
    };
    aiConfig?: AiConfig;
    gitOwner?: string;
}