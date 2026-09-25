FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5174
# Proxies /api to the backend service; see vite.config.ts.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]