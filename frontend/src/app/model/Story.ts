import {Scenario} from './Scenario';
import { Background } from './Background';

export interface Story {
    issue_number: any;
    story_id: any;
    background: Background;
    scenarios: Scenario[];
    title: string;
    body: string;
    state: string;
    assignee: string;
    assignee_avatar_url: string;
    passed?: boolean;
}
