# Stage 1: Build the frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Prepare the backend
FROM node:20-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm install --production
COPY backend/ ./backend/
COPY --from=build /app/frontend/dist ./frontend/dist

# Environment variables
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 5000

# Start the server
CMD ["node", "backend/server.js"]