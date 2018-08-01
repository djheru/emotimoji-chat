FROM mhart/alpine-node:9 AS build

ARG PUSHER_APP_ID
ARG PUSHER_APP_KEY
ARG PUSHER_APP_SECRET
ARG PUSHER_APP_CLUSTER

WORKDIR /srv
ADD package.json .
RUN npm install
ADD . .

FROM mhart/alpine-node:base-9
COPY --from=build /srv .

ENV PUSHER_APP_ID = $PUSHER_APP_ID
ENV PUSHER_APP_KEY = $PUSHER_APP_KEY
ENV PUSHER_APP_SECRET = $PUSHER_APP_SECRET
ENV PUSHER_APP_CLUSTER = $PUSHER_APP_CLUSTER
ENV NODE_ENV=production

EXPOSE 3000
CMD ["node", "server.js"]