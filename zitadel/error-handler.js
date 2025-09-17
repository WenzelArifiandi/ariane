// Zitadel User-Friendly Error Handler
// Intercepts Zitadel API errors and provides better messages

const ERROR_MAPPINGS = {
  // Profile/User errors
  'COMMAND-2M0fs': {
    message: 'No changes detected',
    description: 'The profile information you entered is the same as what\'s already saved. Please modify at least one field to update your profile.',
    type: 'warning',
    code: 'PROFILE_NO_CHANGES'
  },

  'COMMAND-J8dsk': {
    message: 'User initialization required',
    description: 'Your user account is not fully initialized yet. This usually happens after first login or account creation. Please complete the initial setup process or contact your administrator.',
    type: 'info',
    code: 'USER_NOT_INITIALIZED'
  },

  // Authentication errors
  'QUERY-d3fas': {
    message: 'Database connection issue',
    description: 'There was a temporary database connectivity problem. Please try again in a moment.',
    type: 'error',
    code: 'DB_CONNECTION_ERROR'
  },

  // Email verification errors
  'USER-7hG2x': {
    message: 'Email verification required',
    description: 'Please check your email and click the verification link before updating your profile.',
    type: 'info',
    code: 'EMAIL_VERIFICATION_REQUIRED'
  },

  // Permission errors
  'AUTH-9kL3m': {
    message: 'Insufficient permissions',
    description: 'You don\'t have permission to perform this action. Please contact your administrator.',
    type: 'error',
    code: 'INSUFFICIENT_PERMISSIONS'
  },

  // Generic validation errors
  'VALIDATION': {
    message: 'Invalid input',
    description: 'Please check your input and ensure all required fields are filled correctly.',
    type: 'warning',
    code: 'VALIDATION_ERROR'
  }
};

// gRPC status code mappings
const GRPC_STATUS_MAPPINGS = {
  2: { message: 'Unknown error', type: 'error' },
  3: { message: 'Invalid request', type: 'warning' },
  4: { message: 'Request timeout', type: 'warning' },
  5: { message: 'Not found', type: 'error' },
  6: { message: 'Already exists', type: 'info' },
  7: { message: 'Permission denied', type: 'error' },
  8: { message: 'Resource exhausted', type: 'warning' },
  9: { message: 'Precondition failed', type: 'warning', description: 'The operation cannot be completed because a required condition was not met.' },
  11: { message: 'Out of range', type: 'warning' },
  12: { message: 'Not implemented', type: 'error' },
  13: { message: 'Internal error', type: 'error' },
  14: { message: 'Service unavailable', type: 'error' },
  15: { message: 'Data loss', type: 'error' },
  16: { message: 'Authentication required', type: 'info' }
};

/**
 * Processes Zitadel error responses and returns user-friendly messages
 * @param {Object} error - The error object from Zitadel API
 * @param {Object} context - Additional context information
 * @returns {Object} - Processed error with user-friendly message
 */
function friendlyErrorHandler(error, context = {}) {
  let friendlyError = {
    original: error,
    timestamp: new Date().toISOString(),
    context: context
  };

  // Check for specific Zitadel error codes
  for (const [code, mapping] of Object.entries(ERROR_MAPPINGS)) {
    if (error && error.toString().includes(code)) {
      return {
        ...friendlyError,
        ...mapping,
        originalCode: code
      };
    }
  }

  // Check gRPC status codes
  if (error && error.grpcStatus) {
    const grpcMapping = GRPC_STATUS_MAPPINGS[error.grpcStatus];
    if (grpcMapping) {
      return {
        ...friendlyError,
        ...grpcMapping,
        code: `GRPC_${error.grpcStatus}`,
        originalCode: error.grpcStatus
      };
    }
  }

  // Handle HTTP status codes
  if (error && error.status) {
    switch (error.status) {
      case 400:
        return {
          ...friendlyError,
          message: 'Bad request',
          description: 'The request contained invalid data. Please check your input and try again.',
          type: 'warning',
          code: 'BAD_REQUEST'
        };
      case 401:
        return {
          ...friendlyError,
          message: 'Authentication required',
          description: 'Please log in to access this resource.',
          type: 'info',
          code: 'AUTHENTICATION_REQUIRED'
        };
      case 403:
        return {
          ...friendlyError,
          message: 'Access denied',
          description: 'You don\'t have permission to access this resource.',
          type: 'error',
          code: 'ACCESS_DENIED'
        };
      case 404:
        return {
          ...friendlyError,
          message: 'Not found',
          description: 'The requested resource could not be found.',
          type: 'warning',
          code: 'NOT_FOUND'
        };
      case 500:
        return {
          ...friendlyError,
          message: 'Server error',
          description: 'An internal server error occurred. Please try again later.',
          type: 'error',
          code: 'INTERNAL_SERVER_ERROR'
        };
    }
  }

  // Default fallback
  return {
    ...friendlyError,
    message: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    type: 'error',
    code: 'UNKNOWN_ERROR'
  };
}

// Usage examples:
// console.log(friendlyErrorHandler('COMMAND-2M0fs'));
// console.log(friendlyErrorHandler({ grpcStatus: 9 }));
// console.log(friendlyErrorHandler({ status: 400 }));

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { friendlyErrorHandler, ERROR_MAPPINGS, GRPC_STATUS_MAPPINGS };
}

// Browser global export
if (typeof window !== 'undefined') {
  window.ZitadelErrorHandler = {
    friendlyErrorHandler,
    ERROR_MAPPINGS,
    GRPC_STATUS_MAPPINGS
  };
}