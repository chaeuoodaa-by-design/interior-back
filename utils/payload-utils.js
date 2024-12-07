module.exports = {
    success: function (message, obj) {
        return {
            timestamp: Date.now(),
            data: {
                message: message,
                detail: obj
            }
        };
    },
    error: function (status, code, message) {
        return {
            timestamp: Date.now(),
            error: {
                status: status,
                code: code,
                message: message
            }
        };
    }
};