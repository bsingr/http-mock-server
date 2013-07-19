const fs = require('fs');
const USE_LOGGING = process.env.LOG !== 'no'
const USE_TLS = process.env.USE_TLS !== undefined;
const protocol = USE_TLS ? 'https' : 'http'
const { createServer, maxHeaderSize } = require(protocol);

const options = {};
if (USE_TLS) {
  options.key = fs.readFileSync('./tls/key.key')
  options.cert = fs.readFileSync('./tls/cert.crt')
}

const server = createServer(options, buildRequestListener([
  respondWithHeaders,
  respondWithBody,
  respondWithCounter,
  respondWithStatusCode,
  delayResponse,
]));

function buildRequestListener(middlewares) {
  return async function requestListener(request, response) {
    const { httpVersion, method, url, headers, rawHeaders  } = request;
    if (USE_LOGGING) console.log(`${new Date().toISOString()} v${httpVersion} ${method} ${url} ${JSON.stringify(headers)}`);

    const responseData = {
      method,
      url,
      path: url,
      headers,
      rawHeaders,
      size: calculateRequestSize(request),
    };
    
    for (const middleware of middlewares) {
      await middleware(request, response, responseData)
    }

    response.end(JSON.stringify(responseData));
  }
}

async function respondWithStatusCode(request, response, responseData) {
  response.statusCode = calculateStatusCode(request.headers);
}

async function respondWithHeaders(request, response, responseData) {
  const xMockResponseHeader = request.headers['x-mock-response-header'];
  if (xMockResponseHeader) {
    try {
      const headers = JSON.parse(xMockResponseHeader);
      Object
        .entries(headers)
        .forEach(header => response.setHeader(...header));
    } catch (e) {
      responseData.xMockResponseHeaderError = e.message
    }
  }
}

const SHARED_STATE = { counters: {} };
async function respondWithCounter(request, response, responseData) {
  const xMockCounter = request.headers['x-mock-counter'];
  if (xMockCounter) {
    SHARED_STATE.counters[xMockCounter] = (SHARED_STATE.counters[xMockCounter] || 0) + 1;
    responseData.counter = SHARED_STATE.counters[xMockCounter];
  }
}

async function respondWithBody(request, response, responseData) {
  const xMockBody = request.headers['x-mock-body'];
  if (xMockBody) {
    responseData.body = xMockBody === "mirror-url" ? url : xMockBody;
  } else {
    responseData.body = await bodyToString(request)
  }
}

async function delayResponse(request, response, responseData) {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, calculateDelay(request.headers['x-mock-delay']));  
  })
}

function calculateRequestSize(request) {
  const { method, url, httpVersion, rawHeaders } = request
  const requestMethodSize = `${method.toUpperCase()} ${url} HTTP/${httpVersion}\r\n`.length
  const headersSize = rawHeaders.reduce((sum, header) => sum + header.length, 0)
    // 4 bytes - <colon><space>\r\n
    + 4 * rawHeaders.length / 2;
  return requestMethodSize + headersSize + 2; // 2 bytes - \r\n
}

async function bodyToString(request) {
  const bodyChunks = [];
  for await (const chunk of request) {
    bodyChunks.push(chunk);
  }
  return Buffer.concat(bodyChunks).toString()
}

function calculateStatusCode(headers) {
  const xMockStatus = headers['x-mock-status'];
  if (xMockStatus) {
    return parseInt(xMockStatus);
  }

  const xMockLimitSingleHeaderLength = headers['x-mock-limit-single-header-length'];
  if (xMockLimitSingleHeaderLength) {
    const limitIsExceeded = Object
      .entries(headers)
      .find(header => calculateHeaderSize(...header) > xMockLimitSingleHeaderLength) !== undefined;

    if (limitIsExceeded) {
      return parseInt(headers['x-mock-limit-single-header-exceeded-status'], 10)
    }
  }

  const xMockLimitWholeHeaderLength = headers['x-mock-limit-all-header-length'];
  if (xMockLimitWholeHeaderLength) {
    if (calculateHeadersLength(headers) > xMockLimitWholeHeaderLength) {
      return parseInt(headers['x-mock-limit-all-header-exceeded-status'], 10)
    }
  }

  return 200 // default
}

function calculateHeadersLength(headers) {
  return Object
    .entries(headers)
    .reduce((sum, header) => sum + calculateHeaderSize(...header), 0)
}

function calculateHeaderSize(name, value) {
  return `${name}: ${value}`.length
}

function calculateDelay(header) {
  return header ? parseInt(header, 10) : 0;
}

module.exports = {server, maxHeaderSize, protocol}
