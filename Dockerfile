FROM node:14-alpine as dev

RUN apk update && apk add --no-cache libpq bash perl git g++ make python && rm -rf /var/cache/apk/*

WORKDIR /usr/app

COPY yarn.lock .
COPY package.json .
COPY .env.sample .
RUN yarn install --non-interactive --frozen-lockfile && yarn cache clean

COPY . .
RUN yarn run build

EXPOSE 8545

CMD ["./start.sh"]