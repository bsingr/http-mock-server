const axios = require('axios');
const assert = require('assert');
const { server } = require('../lib/server');

describe('server', () => {
  let BASE_URL = null
  let port = null
  let hostAndPort = null
  before(() => {
    server.listen(0)
    port = server.address().port
    hostAndPort = `localhost:${port}`
    BASE_URL = `http://${hostAndPort}`
  })
  after(() => server.close());

  function assertLengthOfAndRemoveField(data, minSize, fieldName) {
    const portDigits = `${port}`.length
    const actual = parseInt(data[fieldName], 10)
    assert.equal(actual, minSize + portDigits, `${fieldName}=${data[fieldName]} equal minSize=${minSize} + portSize=${portDigits} TRY-HINT:${actual - portDigits}`)
    delete data[fieldName]
  }

  it('responds to / with request mirror', done => {
    axios.get(BASE_URL).then(res => {
      assertLengthOfAndRemoveField(res.data, 159, 'size')
      assert.deepStrictEqual(res.data, {
        "body": "",
        "method": "GET",
        "path": "/",
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-encoding": "gzip, deflate, br",
          "connection": "close",
          "host": hostAndPort,
          "user-agent": "axios/1.1.2"
        },
        "rawHeaders": [
          "Accept",
          "application/json, text/plain, */*",
          "User-Agent",
          "axios/1.1.2",
          "Accept-Encoding",
          "gzip, deflate, br",
          "Host",
          hostAndPort,
          "Connection",
          "close"
        ],
        "url": "/"
      });
      done();
    }).catch(done);
  });

  it('responds to /foo/bar request mirror', done => {
    axios.get(`${BASE_URL}/foo/bar`).then(res => {
      assertLengthOfAndRemoveField(res.data, 166, 'size')
      assert.deepStrictEqual(res.data, {
        "body": "",
        "method": "GET",
        "path": "/foo/bar",
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-encoding": "gzip, deflate, br",
          "connection": "close",
          "host": hostAndPort,
          "user-agent": "axios/1.1.2",
        },
        "rawHeaders": [
          "Accept",
          "application/json, text/plain, */*",
          "User-Agent",
          "axios/1.1.2",
          "Accept-Encoding",
          "gzip, deflate, br",
          "Host",
          hostAndPort,
          "Connection",
          "close"
        ],
        "url": "/foo/bar"
      });
      done();
    }).catch(done);
  });

  describe('middleware header', () => {
    it('responds with x-mock-response-header', async () => {
      const res = await axios.get(BASE_URL, {
        headers: {
          'x-mock-response-header': JSON.stringify({ "foo": "bar" })
        }
      })
      assertLengthOfAndRemoveField(res.data, 198, 'size')
      assert.deepStrictEqual(res.data, {
        "body": "",
        "method": "GET",
        "path": "/",
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-encoding": "gzip, deflate, br",
          "connection": "close",
          "host": hostAndPort,
          "user-agent": "axios/1.1.2",
          "x-mock-response-header": "{\"foo\":\"bar\"}"
        },
        "rawHeaders": [
          "Accept",
          "application/json, text/plain, */*",
          "x-mock-response-header",
          "{\"foo\":\"bar\"}",
          "User-Agent",
          "axios/1.1.2",
          "Accept-Encoding",
          "gzip, deflate, br",
          "Host",
          hostAndPort,
          "Connection",
          "close"
        ],
        "url": "/"
      });
      delete res.headers.date;
  
      assertLengthOfAndRemoveField(res.headers, 482, 'content-length')
      assert.deepStrictEqual(JSON.parse(JSON.stringify(res.headers)), {
        "connection": "close",
        "foo": "bar"
      });
    });
  })

  it('responds with x-mock-counter', async () => {
    const responses = []
    responses.push(await axios.get(BASE_URL, { headers: { 'x-mock-counter': 'foo' } }))
    responses.push(await axios.get(BASE_URL, { headers: { 'x-mock-counter': 'bar' } }))
    responses.push(await axios.get(BASE_URL, { headers: { 'x-mock-counter': 'foo' } }))
    responses.push(await axios.get(BASE_URL, { headers: { 'x-mock-counter': 'bar' } }))
    responses.push(await axios.get(BASE_URL, { headers: { 'x-mock-counter': 'bar' } }))
    assert.strictEqual(responses[0].data['counter'], 1);
    assert.strictEqual(responses[1].data['counter'], 1);
    assert.strictEqual(responses[2].data['counter'], 2);
    assert.strictEqual(responses[3].data['counter'], 2);
    assert.strictEqual(responses[4].data['counter'], 3);
  });

  it('responds with x-mock-status', async () => {
    const res = await axios.get(BASE_URL, {
      headers: {
        'x-mock-status': 299
      }
    })
    assert.strictEqual(res.status, 299);
  });

  // note: nodejs since v10/v11 limits headers to 8k
  // see https://nodejs.org/api/http.html#http_http_maxheadersize
  // -> this is changed in this project using argument --max-http-header-size
  describe('limit single header length', () => {
    it('responds with ok', async () => {
      await axios.get(BASE_URL, {
        validateStatus: s => s === 200,
        headers: {
          'x-mock-limit-single-header-length': 16 * 1024,
          'x-mock-limit-single-header-exceeded-status': 400
        }
      })
    });

    it('responds with ok if limit equals', async () => {
      const limit = 16 * 1024;
      await axios.get(BASE_URL, {
        validateStatus: s => s === 200,
        headers: {
          'x-mock-limit-single-header-length': limit,
          'x-mock-limit-single-header-exceeded-status': 400,
          'stuffing': 'a'.repeat(limit - 'stuffing: '.length)
        }
      });
    });

    it('responds with error if limit exceeded by 1', async () => {
      const limit = 16 * 1024;
      await axios.get(BASE_URL, {
        validateStatus: s => s === 400,
        headers: {
          'x-mock-limit-single-header-length': limit,
          'x-mock-limit-single-header-exceeded-status': 400,
          'stuffing': 'a'.repeat(limit - 'stuffing: '.length + 1)
        }
      });
    });
  });

  describe('limit all header length', () => {
    it('responds with ok', async () => {
      await axios.get(BASE_URL, {
        validateStatus: s => s === 200,
        headers: {
          'x-mock-limit-all-header-length': 16 * 1024,
          'x-mock-limit-all-header-exceeded-status': 400
        }
      })
    });

    // note: there is little inaccuracy because it ignores axios client headers like host,user-agent,...
    it('responds with ok if limit equals', async () => {
      const inaccurateDefaultHeadersLength = 200;
      const limit = 16 * 1024;
      const headers = {
        'x-mock-limit-all-header-length': limit,
        'x-mock-limit-all-header-exceeded-status': 400,
      };
      const lengthForControlHeaders = calculateAllHttpHeaderLength(headers);
      headers.padding = '0'.repeat(limit - lengthForControlHeaders - 'padding: '.length - inaccurateDefaultHeadersLength);
      await  axios.get(BASE_URL, {
        validateStatus: s => s === 200,
        headers
      })
    });

    // note: there is little inaccuracy because it ignores axios client headers like host,user-agent,...
    it('responds with error if limit exceeded by default headers', () => {
      const inaccurateDefaultHeadersLength = 200;
      const limit = 16 * 1024;
      const headers = {
        'x-mock-limit-all-header-length': limit,
        'x-mock-limit-all-header-exceeded-status': 400
      };
      const lengthForControlHeaders = calculateAllHttpHeaderLength(headers);
      headers.stuffing = 'a'.repeat(limit - lengthForControlHeaders - 'stuffing: '.length + inaccurateDefaultHeadersLength);
      return axios.get(BASE_URL, {
        validateStatus: s => s === 400,
        headers
      })
    });

    // http utility functions
    function calculateAllHttpHeaderLength(headers) {
      function calculateHttpHeaderLength(headerName, headerValue) {
        return (headerName + ': ' + headerValue).length
      }

      return Object.keys(headers).reduce((sum, headerName) => {
        return sum + calculateHttpHeaderLength(headerName, headers[headerName]);
      }, 0)
    }
  });
});
