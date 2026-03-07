FROM node:24-slim

WORKDIR /app

# Copy root package files and install root dependencies
COPY package*.json ./
RUN npm install

# Copy workout-tracker package files and install (including devDeps for build)
COPY workout-tracker/package*.json ./workout-tracker/
RUN cd workout-tracker && npm install

# Copy everything else
COPY . .

# Build the React frontend
RUN cd workout-tracker && npm run build

EXPOSE 3000

CMD ["node", "start.js"]
