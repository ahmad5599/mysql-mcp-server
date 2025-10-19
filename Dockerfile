FROM node:20
WORKDIR /app
COPY package.json .
RUN npm install
COPY server.js .
ENV MYSQL_MCP_READ_ONLY=true
CMD ["node", "server.js"]