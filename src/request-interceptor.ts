/**
 * Docs:
 * - https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-interceptors-types.html
 * - https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-interceptors-configuration.html
 * - https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-headers.html
 */

// Input Types
export interface InterceptorInput {
  interceptorInputVersion: string;
  mcp: {
    rawGatewayRequest: {
      body: string;
    };
    gatewayRequest: {
      path: string;
      httpMethod: string;
      headers?: Record<string, string>;
      body: Record<string, unknown>;
    };
  };
}

// Output Types
export interface TransformedGatewayRequest {
  headers?: Record<string, string>;
  body: Record<string, unknown>;
}

export interface TransformedGatewayResponse {
  statusCode: number;
  body: Record<string, unknown>;
}

export interface InterceptorOutput {
  interceptorOutputVersion: string;
  mcp: {
    transformedGatewayRequest: TransformedGatewayRequest;
    transformedGatewayResponse?: TransformedGatewayResponse;
  };
}

/**
 * Creates a transformed gateway response object.
 * This can be used to short-circuit the request and return a response immediately.
 */
export function createTransformedGatewayResponse(
  statusCode: number,
  body: Record<string, unknown>
): TransformedGatewayResponse {
  /**
   * Sample:
   *
   "transformedGatewayResponse" : {
        "statusCode": 200,
        "body": {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "<result_content>": "<result_value>"
            }
        }
    }
   */

  return {
    statusCode,
    body,
  };
}

/**
 * Propagates headers from the incoming request to the outgoing request.
 * - All incoming headers are forwarded to the target
 * - Authorization header is automatically propagated (overrides any existing)
 * - Custom headers are merged (interceptor headers take precedence)
 */
export function propagateHeaders(
  incomingHeaders?: Record<string, string>,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const propagatedHeaders: Record<string, string> = {};

  // Forward all incoming headers
  if (incomingHeaders) {
    for (const [key, value] of Object.entries(incomingHeaders)) {
      propagatedHeaders[key] = value;
    }
  }

  // Merge additional headers (these take precedence over incoming headers)
  if (additionalHeaders) {
    for (const [key, value] of Object.entries(additionalHeaders)) {
      propagatedHeaders[key] = value;
    }
  }

  console.log('Propagated Headers:', JSON.stringify(propagatedHeaders, null, 2));

  return propagatedHeaders;
}

/**
 * Filters out headers with 'x-amzn' prefix and prefixes remaining headers with 'header_'.
 * @param headers - The original headers object
 * @returns A new object with filtered and prefixed headers
 */
export function filterAndPrefixHeaders(
  headers?: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  if (!headers) {
    return result;
  }

  for (const [key, value] of Object.entries(headers)) {
    // Filter out headers with 'x-amzn' prefix (case-insensitive)
    if (key.toLowerCase().startsWith('x-amzn')) {
      continue;
    }
    // Prefix remaining headers with 'header_'
    result[`mcp_header_${key}`] = value;
  }

  console.log('Filtered and Prefixed Headers:', JSON.stringify(result, null, 2));

  return result;
}

/**
 * Handles the incoming interceptor request.
 * Logs the full payload and returns the expected interceptor output.
 * Propagates all headers from the incoming request to the target.
 */
export function handleInterceptorRequest(input: InterceptorInput): InterceptorOutput {
  console.log('Interceptor Input:', JSON.stringify(input, null, 2));
  console.log('Raw Gateway Request Body:', input.mcp.rawGatewayRequest.body);
  console.log('Gateway Request Path:', input.mcp.gatewayRequest.path);
  console.log('Gateway Request Method:', input.mcp.gatewayRequest.httpMethod);
  console.log('Gateway Request Headers:', JSON.stringify(input.mcp.gatewayRequest.headers, null, 2));
  console.log('Gateway Request Body:', JSON.stringify(input.mcp.gatewayRequest.body, null, 2));

  // Propagate all incoming headers to the target
  const headers = propagateHeaders(input.mcp.gatewayRequest.headers);

  // Filter out x-amzn headers and prefix remaining with 'mcp_header_'
  const prefixedHeaders = filterAndPrefixHeaders(input.mcp.gatewayRequest.headers);

  // Build the merged body with prefixed headers inside params.arguments
  const originalBody = input.mcp.gatewayRequest.body;
  const params = (originalBody.params as Record<string, unknown>) || {};
  const existingArguments = (params.arguments as Record<string, unknown>) || {};

  const mergedBody: Record<string, unknown> = {
    ...originalBody,
    params: {
      ...params,
      arguments: {
        ...existingArguments,
        ...prefixedHeaders,
      },
    },
  };

  const output: InterceptorOutput = {
    interceptorOutputVersion: '1.0',
    mcp: {
      transformedGatewayRequest: {
        headers,
        body: mergedBody,
      },
    },
  };

  console.log('Interceptor Output:', JSON.stringify(output, null, 2));

  return output;
}

