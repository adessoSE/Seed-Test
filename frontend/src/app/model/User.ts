export interface User {
    email: string;
    password: string;
    github: {
        githubToken: string;
        githubAccountName: string;
        githubRepo: string;
    };
    jira: {
        AccountName: string;
        Password: string;
        Host: string;
    };
}
