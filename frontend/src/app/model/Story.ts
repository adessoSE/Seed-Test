import {Scenario} from './Scenario';
import { Background } from './Background';

export interface Story {
    issue_number: any;
    name: string;
    story_id: string;
    background: Background;
    scenarios: Scenario[];
}
