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
    member_stories: string[];


}
