FROM node:lts-slim

WORKDIR /usr/src/frontend/web

COPY web/package.json .

RUN npm i

COPY . .

CMD ["npm", "run", "devc"]
