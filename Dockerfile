# Use a Node.js 18 base image
FROM node:22

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if it exists)
COPY . .

# Install dependencies.  Use --omit=dev if you don't need devDependencies in production
RUN npm install

# Expose the port your app listens on (replace 3000 with your actual port)
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]