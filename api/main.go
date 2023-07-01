package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
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
	Query        string `json:"query"`
	DataSourceID string `json:"datasource_id"`
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
	datasource, err := datastore.GetDataSourceByID(requestBody.DataSourceID) // r.URL.Query().Get("datasource_id")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(datasource.Name)

	// Access the "query" field from the request body
	query := requestBody.Query

	// Print the extracted "query" field
	fmt.Println("Received query:", query)

	// Open a connection to the database
	db, err := sql.Open("postgres", datasource.ConnectionString)
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

// DataSource represents a data source with a name, connection string, and engine name
type DataSource struct {
	Owner            string `json:"owner" bson:"owner"`
	Name             string `json:"name" bson:"name"`
	ID               string `json:"datasource_id" bson:"datasource_id"`
	ConnectionString string `json:"connection_string" bson:"connection_string"`
	Engine           string `json:"engine" bson:"engine"`
}

// Notebook represents a notebook with a name, last edited date, and a list of cells
type Notebook struct {
	Owner          string    `json:"owner" bson:"owner"`
	Name           string    `json:"name" bson:"name"`
	DataSourceID   string    `json:"datasource_id" bson:"datasource_id"`
	DataSourceName string    `json:"datasource_name" bson:"datasource_name"`
	CreationDate   time.Time `json:"creation_date" bson:"creation_date"`
	LastEdited     time.Time `json:"last_edited" bson:"last_edited"`
	Cells          []Cell    `json:"cells" bson:"cells"`
}

// Cell represents a cell in the notebook with a SQL query and result
type Cell struct {
	Query    string     `json:"query" bson:"query"`
	Result   CellResult `json:"result" bson:"result"`
	ID       string     `json:"id" bson:"id"`
	Position int        `json:"position" bson:"position"`
}

// CellResult represents the result of executing a SQL query in a cell
type CellResult struct {
	Columns []string        `json:"columns" bson:"columns"`
	Rows    [][]interface{} `json:"rows" bson:"rows"`
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

// UpsertDataSource upserts a datasource in the "datasources" collection
func (d *Datastore) WriteDataSource(dataSource *DataSource) error {
	filter := bson.M{"name": dataSource.Name}

	opts := options.Replace().SetUpsert(true)

	_, err := d.database.Collection("datasources").ReplaceOne(context.Background(), filter, dataSource, opts)
	if err != nil {
		return err
	}

	return nil
}

// UpsertNotebook upserts a notebook in the "notebooks" collection
func (d *Datastore) WriteNotebook(notebook *Notebook) error {
	filter := bson.M{"name": notebook.Name}

	opts := options.Replace().SetUpsert(true)

	_, err := d.database.Collection("notebooks").ReplaceOne(context.Background(), filter, notebook, opts)
	if err != nil {
		return err
	}

	return nil
}

// GetNotebooksByOwner retrieves all notebooks for a specific owner
func (d *Datastore) GetNotebooksByOwner(owner string) ([]Notebook, error) {
	filter := bson.M{"owner": owner}

	cur, err := d.database.Collection("notebooks").Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	var notebooks []Notebook
	for cur.Next(context.Background()) {
		var notebook Notebook
		err := cur.Decode(&notebook)
		if err != nil {
			return nil, err
		}

		notebooks = append(notebooks, notebook)
	}

	if err := cur.Err(); err != nil {
		return nil, err
	}

	return notebooks, nil
}

func (d *Datastore) findDataSource(filter interface{}) ([]DataSource, error) {
	cur, err := d.database.Collection("datasources").Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	var dataSources []DataSource
	for cur.Next(context.Background()) {
		var dataSource DataSource
		err := cur.Decode(&dataSource)
		if err != nil {
			return nil, err
		}

		dataSources = append(dataSources, dataSource)
	}

	if err := cur.Err(); err != nil {
		return nil, err
	}

	return dataSources, nil
}

func (d *Datastore) GetDataSourceByID(id string) (*DataSource, error) {
	filter := bson.M{"datasource_id": id}

	dataSource, err := d.findDataSource(filter)
	if err != nil {
		return nil, err
	}

	if len(dataSource) == 0 {
		return nil, errors.New("No data source found with the provided id")
	}

	return &dataSource[0], nil
}

func (d *Datastore) GetDataSourcesByOwner(owner string) ([]DataSource, error) {
	filter := bson.M{"owner": owner}

	dataSources, err := d.findDataSource(filter)
	if err != nil {
		return nil, err
	}

	return dataSources, nil
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

func sendEmail(destination, subject, message string) {
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String("us-east-1"),
		Credentials: credentials.NewStaticCredentials(os.Getenv("SES_USER_ID"), os.Getenv("SES_USER_SECRET"), ""),
	})

	svc := ses.New(sess)

	input := &ses.SendEmailInput{
		Destination: &ses.Destination{
			CcAddresses: []*string{},
			ToAddresses: []*string{
				aws.String(destination),
			},
		},
		Message: &ses.Message{
			Body: &ses.Body{
				Text: &ses.Content{
					Data: aws.String(message),
				},
			},
			Subject: &ses.Content{
				Data: aws.String(subject),
			},
		},
		Source: aws.String("bot@auth.sequel.gessfred.xyz"),
	}

	result, err := svc.SendEmail(input)
	if err != nil {
		if aerr, ok := err.(awserr.Error); ok {
			switch aerr.Code() {
			default:
				fmt.Println(aerr.Error())
			}
		} else {
			fmt.Println(err.Error())
		}
		return
	}

	fmt.Println("Email Sent to address: " + *result.MessageId)
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
		otp := "123456"
		err := datastore.WriteUser(&User{
			UserEmail: r.URL.Query().Get("user_email"),
			Auth: struct {
				Token string    `bson:"token"`
				TTL   time.Time `bson:"ttl"`
				OTP   string    `bson:"otp"`
			}{
				Token: "dummy-token",
				TTL:   time.Now().Add(time.Hour),
				OTP:   otp,
			},
		})
		sendEmail(r.URL.Query().Get("user_email"), "Sequel connection code", otp)
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

	router.HandleFunc("/datasources", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			var datasource DataSource
			err := DecodeRequestBody(r, &datasource)
			if err != nil {
				fmt.Println(err.Error())
			}
			// TODO get owner from authorization
			// TODO set creation_date
			fmt.Println(datasource)
			datastore.WriteDataSource(&datasource)
		} else if r.Method == "GET" {
			datasources, err := datastore.GetDataSourcesByOwner(r.URL.Query().Get("owner"))
			if err != nil {
				fmt.Println(err)
			}
			respondWithJSON(w, datasources, 200)
		}
	})

	router.HandleFunc("/notebooks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			var notebook Notebook
			err := DecodeRequestBody(r, &notebook)
			if err != nil {
				fmt.Println(err.Error())
			}
			// TODO get owner from authorization
			// TODO set creation_date
			fmt.Println(notebook)
			datastore.WriteNotebook(&notebook)
		} else if r.Method == "GET" {
			notebooks, err := datastore.GetNotebooksByOwner(r.URL.Query().Get("owner"))
			if err != nil {
				fmt.Println(err)
			}
			respondWithJSON(w, notebooks, 200)
		}
	})

	// Start the HTTP server
	c := cors.Default().Handler(router)
	log.Fatal(http.ListenAndServe(":8080", c))

}
