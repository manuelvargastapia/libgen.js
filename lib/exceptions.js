const Exceptions = {
    NO_RESULTS: "no results"
}

class SearchError extends Error {
    type;

    constructor(type, message) {
        super(message);
        this.type = type;
    }
}

module.exports = {Exceptions, SearchError};