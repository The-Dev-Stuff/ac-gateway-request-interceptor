import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handleInterceptorRequest, InterceptorInput, InterceptorOutput } from './request-interceptor';

/**
 * Checks if the event is an InterceptorInput from AgentCore Gateway
 */
function isInterceptorInput(event: unknown): event is InterceptorInput {
  return (
    typeof event === 'object' &&
    event !== null &&
    'interceptorInputVersion' in event &&
    'mcp' in event
  );
}

export const handler = async (
  event: APIGatewayProxyEvent | InterceptorInput,
  context: Context
): Promise<APIGatewayProxyResult | InterceptorOutput> => {
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));

  // Handle direct Lambda invocation from AgentCore Gateway
  if (isInterceptorInput(event)) {
    console.log('Processing as InterceptorInput (direct Lambda invocation)');
    return handleInterceptorRequest(event);
  }

  // Handle API Gateway proxy requests
  const apiEvent = event as APIGatewayProxyEvent;
  const path = apiEvent.path;
  const method = apiEvent.httpMethod;

  // Echo endpoint for testing
  if (path === '/echo' && method === 'POST') {
    const body = apiEvent.body ? JSON.parse(apiEvent.body) : {};
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };
  }

  // Request interceptor endpoint (for testing via API Gateway)
  if (path === '/intercept' && method === 'POST') {
    const input: InterceptorInput = apiEvent.body ? JSON.parse(apiEvent.body) : {};
    const output = handleInterceptorRequest(input);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(output),
    };
  }

  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Not Found' }),
  };
};
