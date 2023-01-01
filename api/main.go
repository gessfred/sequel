package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type version struct {
	Timestamp time.Time `bson:"timestamp"`
	Version   string    `bson:"version"`
}

func main() {
	// Connect to MongoDB
	connectionString := os.Getenv("MONGODB_CONNECTION_STRING")
	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(connectionString))
	if err != nil {
		log.Fatal(err)
	}

	// Make sure the connection is closed when the program is finished
	defer client.Disconnect(context.TODO())

	// Get a handle to the "versions" collection
	versionsCollection := client.Database("sequel").Collection("versions")

	// Define the HTTP handler for the /version endpoint
	http.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		fmt.Println("GET /version")
		// Query the "versions" collection for the version with the latest timestamp
		var latest version
		err := versionsCollection.FindOne(context.TODO(), bson.M{}, options.FindOne().SetSort(bson.M{"timestamp": -1})).Decode(&latest)
		if err != nil {
			fmt.Println("Error: " + err.Error())
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Return the latest version
		fmt.Fprintf(w, "Latest version: %s\n", latest.Version)
	})

	// Start the HTTP server
	log.Fatal(http.ListenAndServe(":8080", nil))
}
