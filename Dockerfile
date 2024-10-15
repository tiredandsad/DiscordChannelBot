# Use the official Node.js image as a base image
FROM node:16

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose the port your bot runs on (optional, not necessary for Discord bots)
# EXPOSE 3000 

# Command to run the bot
CMD ["node", "app.js"]
