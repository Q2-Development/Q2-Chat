FROM node:lts-slim

WORKDIR /usr/src/frontend/

COPY . .

RUN npm i

CMD ["npm", "run", "dev"]
