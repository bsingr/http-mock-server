FROM node:18-alpine

ENV NODE_OPTIONS "--max-http-header-size=65536"
ENV PORT=8888
EXPOSE $PORT

RUN mkdir /app
WORKDIR /app
COPY tls tls
COPY lib lib
COPY bin bin

CMD ["/app/bin/server"]

HEALTHCHECK --interval=30s --timeout=1s CMD netstat -ltn | grep -c $PORT || exit 1
