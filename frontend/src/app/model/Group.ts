export interface Group {
    /**
     * Object id of the story in the database
     */
    _id: any;

    /**
     * Title of the Group
     */
    title: string;

    /**
     * ids of memberStories
     */
    memberStories: string[];


}
