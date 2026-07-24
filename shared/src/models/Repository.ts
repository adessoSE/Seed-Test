import { AiConfig } from './RepositoryContainer';
import { Group } from './Group';

export interface Repository {
    _id?: string;
    owner: string;
    repoName: string;
    stories: string[];
    repoType: 'db' | 'github' | 'jira';
    customBlocks?: string[];
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