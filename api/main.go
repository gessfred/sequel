package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Result struct {
	Columns []string        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
}

type RequestBody struct {
	Query string `json:"query"`
}

func executeQuery(db *sql.DB, query string) ([]string, [][]interface{}, error) {
	// Execute the query
	rows, err := db.Query(query)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	// Get the column names
	columns, err := rows.Columns()
	if err != nil {
		return nil, nil, err
	}

	// Create a slice to hold the column values
	values := make([]interface{}, len(columns))
	valuePtrs := make([]interface{}, len(columns))
	for i := range columns {
		valuePtrs[i] = &values[i]
	}

	// Create a slice to hold the rows
	var resultRows [][]interface{}

	// Iterate over the query results
	for rows.Next() {
		// Scan the row into the slice of values
		err := rows.Scan(valuePtrs...)
		if err != nil {
			return nil, nil, err
		}

		// Create a slice to hold the current row's values
		rowValues := make([]interface{}, len(columns))
		for i, col := range values {
			if value, ok := col.([]byte); ok {
				rowValues[i] = string(value)
			} else {
				rowValues[i] = col
			}
		}

		// Append the row to the result rows
		resultRows = append(resultRows, rowValues)
	}

	if err = rows.Err(); err != nil {
		return nil, nil, err
	}

	return columns, resultRows, nil
}

func DecodeRequestBody(r *http.Request, v interface{}) error {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return err
	}
	defer r.Body.Close()

	err = json.Unmarshal(body, v)
	if err != nil {
		return err
	}

	return nil
}

func respondWithJSON(w http.ResponseWriter, data interface{}, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	err := json.NewEncoder(w).Encode(data)
	if err != nil {
		fmt.Println(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func queryHandler(w http.ResponseWriter, r *http.Request, datastore *Datastore) {
	// Read the POST body
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Parse the request body as JSON
	var requestBody RequestBody
	err = json.Unmarshal(body, &requestBody)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Access the "query" field from the request body
	query := requestBody.Query

	// Print the extracted "query" field
	fmt.Println("Received query:", query)

	// Open a connection to the database
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Test the connection
	err = db.Ping()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	columns, rows, err := executeQuery(db, query)
	if err != nil {
		fmt.Println(err.Error())
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Create a Result struct
	result := Result{
		Columns: columns,
		Rows:    rows,
	}

	// Set the response Content-Type to application/json
	w.Header().Set("Content-Type", "application/json")

	// Encode the result as JSON
	err = json.NewEncoder(w).Encode(result)
	if err != nil {
		fmt.Println(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

/*
datastore
*/
type User struct {
	UserEmail string `bson:"user_email"`
	Auth      struct {
		Token string    `bson:"token"`
		TTL   time.Time `bson:"ttl"`
		OTP   string    `bson:"otp"`
	} `bson:"auth"`
}

// Datastore represents the MongoDB datastore
type Datastore struct {
	client   *mongo.Client
	database *mongo.Database
}

// NewDatastore creates a new Datastore instance
func NewDatastore(connectionString, dbName string) (*Datastore, error) {
	// Create the MongoDB client
	client, err := createMongoDBClient(connectionString)
	if err != nil {
		return nil, err
	}

	// Get the collection
	db := client.Database(dbName)

	datastore := &Datastore{
		client:   client,
		database: db,
	}

	return datastore, nil
}

// Close closes the MongoDB client connection
func (d *Datastore) Close() {
	d.client.Disconnect(context.Background())
}

// CreateUser inserts a new user document into the collection
func (d *Datastore) CreateUser(user *User) error {
	_, err := d.database.Collection("users").InsertOne(context.Background(), user)
	if err != nil {
		return err
	}

	return nil
}

// GetUserByEmail retrieves a user document by email from the collection
func (d *Datastore) GetUserByEmail(email string) (*User, error) {
	filter := bson.M{"user_email": email}

	var user User
	err := d.database.Collection("users").FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (d *Datastore) WriteUser(user *User) error {
	fmt.Println("writing", user)
	// Insert or update the user document in the collection
	result, err := d.database.Collection("users").ReplaceOne(context.Background(), bson.M{"user_email": user.UserEmail}, user, options.Replace().SetUpsert(true))
	fmt.Println(result)
	if err != nil {
		return err
	}
	if result.MatchedCount != 0 {
		fmt.Println("matched and replaced an existing document")
		return nil
	}
	if result.UpsertedCount != 0 {
		fmt.Printf("inserted a new document with ID %v\n", result.UpsertedID)
	}
	return nil
}

// DeleteUser deletes a user document from the collection
func (d *Datastore) DeleteUser(email string) error {
	filter := bson.M{"user_email": email}

	_, err := d.database.Collection("users").DeleteOne(context.Background(), filter)
	if err != nil {
		return err
	}

	return nil
}

var (
	connStr  string = os.Getenv("POSTGRES_TEST_CONNECTION")
	mongoUrl string = os.Getenv("MONGODB_CONNECTION_STRING")
)

func createMongoDBClient(connectionString string) (*mongo.Client, error) {
	// Set up a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create client options
	clientOptions := options.Client().ApplyURI(connectionString)

	// Connect to MongoDB
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, err
	}

	// Ping the MongoDB server to verify the connection
	err = client.Ping(ctx, nil)
	if err != nil {
		return nil, err
	}

	fmt.Println("Connected to MongoDB!")

	return client, nil
}

type ChallengeRequestBody struct {
	UserEmail string `json:"user_email"`
	OTP       string `json:"otp"`
}

type LoginToken struct {
	UserEmail string `json:"user_email"`
	Token     string `json:"token"`
}

func main() {

	datastore, err := NewDatastore(mongoUrl, "sequel")
	if err != nil {
		log.Fatal(err)
	}
	defer datastore.Close()
	fmt.Println("starting server...")

	router := mux.NewRouter()

	router.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "0.0.0")
	})

	router.HandleFunc("/query", func(w http.ResponseWriter, r *http.Request) {
		queryHandler(w, r, datastore)
	})

	router.HandleFunc("/login/otp", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println(r.URL.Query().Get("user_email"))
		err := datastore.WriteUser(&User{
			UserEmail: r.URL.Query().Get("user_email"),
			Auth: struct {
				Token string    `bson:"token"`
				TTL   time.Time `bson:"ttl"`
				OTP   string    `bson:"otp"`
			}{
				Token: "dummy-token",
				TTL:   time.Now().Add(time.Hour),
				OTP:   "123456",
			},
		})
		if err != nil {
			fmt.Println(err.Error())
		}
	})

	router.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		var challenge ChallengeRequestBody
		err := DecodeRequestBody(r, &challenge)
		if err != nil {
			fmt.Println(err.Error())
		}
		user, err := datastore.GetUserByEmail(challenge.UserEmail)
		if err != nil {
			fmt.Println(err.Error())
		}
		if user.Auth.OTP == challenge.OTP {
			fmt.Println("Challenge successful")
		}
		respondWithJSON(w, LoginToken{
			UserEmail: challenge.UserEmail,
			Token:     user.Auth.Token,
		}, 200)
	})

	// Start the HTTP server
	c := cors.Default().Handler(router)
	log.Fatal(http.ListenAndServe(":8080", c))

}
