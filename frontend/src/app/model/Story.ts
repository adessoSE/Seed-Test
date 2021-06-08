import {Scenario} from './Scenario';
import { Background } from './Background';

export interface Story {
    _id: any;
    issue_number: any;
    story_id: number;
    storySource: string;
    background: Background;
    scenarios: Scenario[];
    oneDriver?: boolean;
    title: string;
    body: string;
    state: string;
    assignee: string;
    assignee_avatar_url: string;
    lastTestPassed?: boolean;
}
