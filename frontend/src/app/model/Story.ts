import {Scenario} from './Scenario';
import { Background } from './Background';

export interface Story {
    issue_number: number;
    story_id: number;
    background: Background;
    scenarios: Scenario[];
    title: string;
    body: string;
    state: string;
    assignee: string;
    assignee_avatar_url: string;
}
