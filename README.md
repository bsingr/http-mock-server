# HTTP API MOCK SERVER

A simple, zero-dependency http test server, mirroring any http/https request for testing purpose.

Alternatives:

- [httbin.org](http://httpbin.org/)
- [dummyjson.com](https://dummyjson.com/)

## Features

- mirror any http request using JSON response
- (self-signed) https
- plain nodejs, zero (npm) dependencies (except for dev/testing)
- tested with header size up to 32kb
- log http requests

## Environment variables

- `PORT` Default listen port is 8888. The port can be changed by setting the env variable `PORT` to another value.
- `USE_TLS` Set `USE_TLS` to any arbitrary value to enable https (tls/ssl encryption).

## Examples

### Simple request mirroring

```
$ curl http://localhost:8888/foobar
{"method":"GET","url":"/foobar","path":"/foobar","sentHeaders":{"host":"localhost:8888","user-agent":"curl/7.79.1","accept":"*/*"},"sentRawHeaders":["Host","localhost:8888","User-Agent","curl/7.79.1","Accept","*/*"],"body":""}
```

### Mock a counter that starts with 1

```
$ curl -s -H "x-mock-counter: a" http://localhost:8888 | jq .counter
1
$ curl -s -H "x-mock-counter: a" http://localhost:8888 | jq .counter
2
$ curl -s -H "x-mock-counter: b" http://localhost:8888 | jq .counter
1
```

### Mock slow backend with 2s delay

```
$ curl -H "x-mock-delay: 2000" http://localhost:8888
# sleep for 2000ms ...
```

### Mock status

Returns status code.

```
$ curl -H "x-mock-status: 404" http://localhost:8888
```

### Mock body

Returns the passed value.

```
$ curl -s -H "x-mock-body: hello-world" http://localhost:8888 | jq .body
"hello-world"
```

## Contribute

Make it pass `npm test` and then send your pull-request ;-)

## LICENSE

See [LICENSE](LICENSE).
