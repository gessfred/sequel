package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
  "net/smtp"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func sendEmail(recipient string, subject string, body string) {
  // SMTP configuration
  username := "fredd.gess@gmail.com"
  password := os.Getenv("SENDINBLUE_SMTP_PASSWORD")
  host := "smtp-relay.sendinblue.com"
  port := "587"

  // Sender and receiver
  from := "fredd.gess@gmail.com"
  to := []string{
    recipient,
  }

  // Build the message
  message := fmt.Sprintf("From: %s\r\n", from)
  message += fmt.Sprintf("To: %s\r\n", to)
  message += fmt.Sprintf("Subject: %s\r\n", subject)
  message += fmt.Sprintf("\r\n%s\r\n", body)

  // Authentication.
  auth := smtp.PlainAuth("", username, password, host)

  // Send email
  err := smtp.SendMail(host+":"+port, auth, from, to, []byte(message))
  if err != nil {
    fmt.Println(err)
    return
  }
  
}

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

  http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) { 
    recipient := r.URL.Query().Get("user_email")
    sendEmail(recipient, "OTP", "<code>1234</code>")
  })

	// Start the HTTP server
	log.Fatal(http.ListenAndServe(":8080", nil))
  
}
