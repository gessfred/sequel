FROM golang:latest

# Set the working directory to the root of the Go module
WORKDIR /app

# Copy the source code to the working directory
COPY . .

# Build the Go server
RUN go build -o server .

# Expose the default server port
EXPOSE 8080

# Run the Go server
CMD ["./server"]
