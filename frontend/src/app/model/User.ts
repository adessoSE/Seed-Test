/**
 * Interface of a user
 */
export interface User {
    /**
     * Object id of the user in the database
     */
    _id: any;

    /**
     * Email of the user
     */
    email: string;

    /**
     * Password of the user usually hashed
     */
    password: string;

    /**
     * Github object of the user if it is connected to github
     */
    github: {
        /** 
         * Token to access the github data of the user
        */
        githubToken: string;

        /**
         * Name of the user in github
         */
        githubAccountName: string;

        /** 
         * Last used github repository
        */
        githubRepo: string;
    };

    /**
     * Jira object of the user if it is connected to jira
     */
    jira: {
        /**
         * Account name of the user
         */
        AccountName: string;

        /**
         * Password of the user usually hashed
         */
        Password: string;

        /**
         * Address of the jira host
         */
        Host: string;
    };
}
