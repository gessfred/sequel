FROM alpine
RUN apk add --update nodejs npm
RUN npm install --global serve
WORKDIR /app
COPY ./web/package.json /app
RUN npm install
COPY ./web/src ./src
COPY ./web/public/ ./public/
RUN NODE_OPTIONS=--openssl-legacy-provider npm run build
RUN ls build/static && echo 'Build output [OK]'
RUN rm -rf node_modules/
COPY ./web/serve.sh .
RUN chmod u+wrx serve.sh
ENTRYPOINT ["./serve.sh"]
ENV HTTP_PORT 8080
EXPOSE 8080