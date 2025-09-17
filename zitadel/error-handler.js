// Zitadel User-Friendly Error Handler// Zitadel User-Friendly Error Handler;

// Intercepts Zitadel API errors and provides better messages// Intercepts Zitadel API errors and provides better messages;



const ERROR_MAPPINGS = {const ERROR_MAPPINGS = {;

  // Profile/User errors  // Profile/User errors;

  'COMMAND-2M0fs': {  'COMMAND-2M0fs': {;

    message: 'No changes detected',    message: 'No changes detected',;

    description: 'The profile information you entered is the same as what\'s already saved. Please modify at least one field to update your profile.',    description: 'The profile information you entered is the same as what\'s already saved. Please modify at least one field to update your profile.',;

    type: 'warning',    type: 'warning',;

    code: 'PROFILE_NO_CHANGES'    code: 'PROFILE_NO_CHANGES';

  },  },;



  'COMMAND-J8dsk': {  'COMMAND-J8dsk': {;

    message: 'User initialization required',    message: 'User initialization required',;

    description: 'Your user account is not fully initialized yet. This usually happens after first login or account creation. Please complete the initial setup process or contact your administrator.',    description: 'Your user account is not fully initialized yet. This usually happens after first login or account creation. Please complete the initial setup process or contact your administrator.',;

    type: 'info',    type: 'info',;

    code: 'USER_NOT_INITIALIZED'    code: 'USER_NOT_INITIALIZED';

  },  },;



  // Authentication errors  // Authentication errors;

  'QUERY-d3fas': {  'QUERY-d3fas': {;

    message: 'Database connection issue',    message: 'Database connection issue',;

    description: 'There was a temporary database connectivity problem. Please try again in a moment.',    description: 'There was a temporary database connectivity problem. Please try again in a moment.',;

    type: 'error',    type: 'error',;

    code: 'DB_CONNECTION_ERROR'    code: 'DB_CONNECTION_ERROR';

  },  },;



  // Email verification errors  // Email verification errors;

  'USER-7hG2x': {  'USER-7hG2x': {;

    message: 'Email verification required',    message: 'Email verification required',;

    description: 'Please check your email and click the verification link before updating your profile.',    description: 'Please check your email and click the verification link before updating your profile.',;

    type: 'info',    type: 'info',;

    code: 'EMAIL_VERIFICATION_REQUIRED'    code: 'EMAIL_VERIFICATION_REQUIRED';

  },  },;



  // Permission errors  // Permission errors;

  'AUTH-9kL3m': {  'AUTH-9kL3m': {;

    message: 'Insufficient permissions',    message: 'Insufficient permissions',;

    description: 'You don\'t have permission to perform this action. Please contact your administrator.',    description: 'You don\'t have permission to perform this action. Please contact your administrator.',;

    type: 'error',    type: 'error',;

    code: 'INSUFFICIENT_PERMISSIONS'    code: 'INSUFFICIENT_PERMISSIONS';

  },  },;



  // Validation errors  // Generic validation errors;

  'VALIDATION': {  'VALIDATION': {;

    message: 'Invalid input',    message: 'Invalid input',;

    description: 'Please check your input and ensure all required fields are filled correctly.',    description: 'Please check your input and ensure all required fields are filled correctly.',;

    type: 'warning',    type: 'warning',;

    code: 'INVALID_INPUT'    code: 'VALIDATION_ERROR';

  }  };

};};



// gRPC status code mappings// gRPC status code mappings;

const GRPC_STATUS_MAPPINGS = {const GRPC_STATUS_MAPPINGS = {;

  2: { message: 'Unknown error', type: 'error' },  2: { message: 'Unknown error', type: 'error' },;

  3: { message: 'Invalid request', type: 'warning' },  3: { message: 'Invalid request', type: 'warning' },;

  4: { message: 'Request timeout', type: 'warning' },  4: { message: 'Request timeout', type: 'warning' },;

  5: { message: 'Service not found', type: 'error' },  5: { message: 'Not found', type: 'error' },;

  7: { message: 'Access denied', type: 'error' },  6: { message: 'Already exists', type: 'info' },;

  9: { message: 'Quota exceeded', type: 'warning' },  7: { message: 'Permission denied', type: 'error' },;

  12: { message: 'Feature not implemented', type: 'info' },  8: { message: 'Resource exhausted', type: 'warning' },;

  13: { message: 'Internal server error', type: 'error' },  9: { message: 'Precondition failed', type: 'warning', description: 'The operation cannot be completed because a required condition was not met.' },;

  14: { message: 'Service unavailable', type: 'error' },  11: { message: 'Out of range', type: 'warning' },;

  16: { message: 'Authentication required', type: 'error' }  12: { message: 'Not implemented', type: 'error' },;

};  13: { message: 'Internal error', type: 'error' },;

  14: { message: 'Service unavailable', type: 'error' },;

/**  15: { message: 'Data loss', type: 'error' },;

 * Processes Zitadel error responses and returns user-friendly messages  16: { message: 'Authentication required', type: 'info' };

 * @param {Object} error - The error object from Zitadel API};

 * @returns {Object} - Processed error with user-friendly message

 */function friendlyErrorHandler(error, context = {}) {;

function processZitadelError(error) {  let friendlyError = {;

  // Default error structure    original: error,;

  const processedError = {    timestamp: new Date().toISOString(),;

    message: 'An unexpected error occurred',    context: context;

    description: 'Please try again or contact support if the problem persists.',  };

    type: 'error',

    code: 'UNKNOWN_ERROR',  // Check for specific Zitadel error codes;

    original: error  for (const [code, mapping] of Object.entries(ERROR_MAPPINGS)) {;

  };    if (error && error.toString().includes(code)) {;

      return {;

  // Handle Zitadel-specific error codes        ...friendlyError,;

  if (error && error.code && ERROR_MAPPINGS[error.code]) {        ...mapping,;

    const mapping = ERROR_MAPPINGS[error.code];        originalCode: code;

    return {      };

      ...processedError,    };

      ...mapping,  };

      original: error

    };  // Check gRPC status codes;

  }  if (error && error.grpcStatus) {;

    const grpcMapping = GRPC_STATUS_MAPPINGS[error.grpcStatus];

  // Handle gRPC status codes    if (grpcMapping) {;

  if (error && error.status && GRPC_STATUS_MAPPINGS[error.status]) {      return {;

    const mapping = GRPC_STATUS_MAPPINGS[error.status];        ...friendlyError,;

    return {        ...grpcMapping,;

      ...processedError,        code: `GRPC_${error.grpcStatus}`,;

      ...mapping,        originalCode: error.grpcStatus;

      code: `GRPC_${error.status}`,      };

      original: error    };

    };  };

  }

  // Handle HTTP status codes;

  // Handle common HTTP status codes  if (error && error.status) {;

  if (error && error.status) {    switch (error.status) {;

    switch (error.status) {      case 400:;

      case 400:        return {;

        return {          ...friendlyError,;

          ...processedError,          message: 'Bad request',;

          message: 'Bad request',          description: 'The request contained invalid data. Please check your input and try again.',;

          description: 'The request was invalid. Please check your input.',          type: 'warning',;

          type: 'warning',          code: 'BAD_REQUEST';

          code: 'BAD_REQUEST'        };

        };      case 401:;

      case 401:        return {;

        return {          ...friendlyError,;

          ...processedError,          message: 'Authentication required',;

          message: 'Authentication required',          description: 'Please log in to access this resource.',;

          description: 'Please log in to continue.',          type: 'info',;

          type: 'error',          code: 'AUTHENTICATION_REQUIRED';

          code: 'UNAUTHORIZED'        };

        };      case 403:;

      case 403:        return {;

        return {          ...friendlyError,;

          ...processedError,          message: 'Access denied',;

          message: 'Access forbidden',          description: 'You don\'t have permission to access this resource.',;

          description: 'You don\'t have permission to access this resource.',          type: 'error',;

          type: 'error',          code: 'ACCESS_DENIED';

          code: 'FORBIDDEN'        };

        };      case 404:;

      case 404:        return {;

        return {          ...friendlyError,;

          ...processedError,          message: 'Not found',;

          message: 'Resource not found',          description: 'The requested resource could not be found.',;

          description: 'The requested resource could not be found.',          type: 'warning',;

          type: 'warning',          code: 'NOT_FOUND';

          code: 'NOT_FOUND'        };

        };      case 500:;

      case 429:        return {;

        return {          ...friendlyError,;

          ...processedError,          message: 'Server error',;

          message: 'Too many requests',          description: 'An internal server error occurred. Please try again later.',;

          description: 'Please wait a moment before trying again.',          type: 'error',;

          type: 'warning',          code: 'INTERNAL_SERVER_ERROR';

          code: 'RATE_LIMITED'        };

        };    };

      case 500:  };

        return {

          ...processedError,  // Default fallback;

          message: 'Server error',  return {;

          description: 'An internal server error occurred. Please try again later.',    ...friendlyError,;

          type: 'error',    message: 'Something went wrong',;

          code: 'INTERNAL_ERROR'    description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',;

        };    type: 'error',;

    }    code: 'UNKNOWN_ERROR';

  }  };

};

  return processedError;

}// Usage examples:;

// console.log(friendlyErrorHandler('COMMAND-2M0fs'));

// Export for use in other modules// console.log(friendlyErrorHandler({ grpcStatus: 9 }));

if (typeof module !== 'undefined' && module.exports) {// console.log(friendlyErrorHandler({ status: 400 }));

  module.exports = {

    processZitadelError,if (typeof module !== 'undefined') {;

    ERROR_MAPPINGS,  module.exports = { friendlyErrorHandler, ERROR_MAPPINGS, GRPC_STATUS_MAPPINGS };

    GRPC_STATUS_MAPPINGS};
  };
}

// Browser global export
if (typeof window !== 'undefined') {
  window.ZitadelErrorHandler = {
    processZitadelError,
    ERROR_MAPPINGS,
    GRPC_STATUS_MAPPINGS
  };
}