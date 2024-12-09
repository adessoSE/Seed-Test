export interface Group {
    /**
     * Object id of the story in the database
     */
    _id: any;

    /**
     * Title of the Group
     */
    name: string;

    /**
     * ids of memberStories
     */
    member_stories: any[];

     /**
     * boolean for sequential execution of the tests
     */
    isSequential: boolean;

    /**
     *  xray test set
     */
    xrayTestSet?: boolean;
}
