export class MetaScopeError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.details = details;
    }
}

export class UnsupportedFormatError extends MetaScopeError {}

export class InvalidFormatError extends MetaScopeError {}

export class TruncatedDataError extends MetaScopeError {}

export class C2PANotFoundError extends MetaScopeError {
    constructor(message = "No C2PA metadata found.", details = {}) {
        super(message, details);
    }
}

export class ParseError extends MetaScopeError {}

export default {
    MetaScopeError,
    UnsupportedFormatError,
    InvalidFormatError,
    TruncatedDataError,
    C2PANotFoundError,
    ParseError
};
