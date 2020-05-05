class MongoError extends Error {
    constructor(message){
        super(message);
    }
}

class CucumberError extends Error {
    constructor(message){
        super(message);
    }
}

class JiraError extends Error{
    constructor(message){
        super(message);
    }
}

class GithubError extends Error{
    constructor(message){
        super(message);
    }
}

class UserError extends Error{
    constructor(message){
        super(message);
    }
}

module.exports = {
    UserError,
    GithubError,
    JiraError,
    CucumberError,
    MongoError
};
