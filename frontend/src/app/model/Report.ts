export interface Report {
    _id?: any,
    reportTime: number;
    reportName: string;
    jsonReport: any;
    options: any;
    storyId: any;
    mode: string;
    scenarioId?: any;
    testStatus: boolean;
}