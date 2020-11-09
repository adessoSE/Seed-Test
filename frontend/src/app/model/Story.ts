import {Scenario} from './Scenario';
import { Background } from './Background';

export interface Story {
    _id: any;
    issue_number: number;
    story_id: number;
    storyType: string;
    background: Background;
    scenarios: Scenario[];
    title: string;
    body: string;
    state: string;
    assignee: string;
    assignee_avatar_url: string;
    lastTestPassed?: boolean;
}
