FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
COPY templates/ ./templates/
EXPOSE 3001
CMD ["node", "dist/index.js"]
