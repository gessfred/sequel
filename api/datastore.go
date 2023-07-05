package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

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
	Owner            string     `json:"owner" bson:"owner"`
	Name             string     `json:"name" bson:"name"`
	ID               string     `json:"datasource_id" bson:"datasource_id"`
	ConnectionString string     `json:"connection_string" bson:"connection_string"`
	Engine           string     `json:"engine" bson:"engine"`
	CreationDate     *time.Time `json:"creation_date" bson:"creation_date"`
	LastConnection   *time.Time `json:"last_connection" bson:"last_connection"`
}

type DataSourceMetadata struct {
	Relations []RelationMetadata `json:"relations"`
}

type RelationMetadata struct {
	Name    string `json:"name" bson:"name"`
	Schema  string `json:"schema" bson:"schema"`
	Columns []ColumnMetadata
}

type ColumnMetadata struct {
	ColumnName string `json:"column_name"`
	DataType   string `json:"dtype"`
}

// Notebook represents a notebook with a name, last edited date, and a list of cells
type Notebook struct {
	Owner          string     `json:"owner" bson:"owner"`
	Name           string     `json:"name" bson:"name"`
	DataSourceID   string     `json:"datasource_id" bson:"datasource_id"`
	DataSourceName string     `json:"datasource_name" bson:"datasource_name"`
	CreationDate   *time.Time `json:"creation_date" bson:"creation_date"`
	LastEdited     time.Time  `json:"last_edited" bson:"last_edited"`
	Cells          []Cell     `json:"cells" bson:"cells"`
}

// Cell represents a cell in the notebook with a SQL query and result
type Cell struct {
	Query        string     `json:"query" bson:"query"`
	Result       CellResult `json:"result" bson:"result"`
	ID           string     `json:"id" bson:"id"`
	Position     int        `json:"position" bson:"position"`
	LastEdited   time.Time  `json:"last_edited" bson:"last_edited"`
	CreationDate *time.Time `json:"creation_date" bson:"creation_date"`
}

// CellResult represents the result of executing a SQL query in a cell
type CellResult struct {
	Columns  []string        `json:"columns" bson:"columns"`
	Rows     [][]interface{} `json:"rows" bson:"rows"`
	Duration float64         `json:"duration" bson:"duration"` // query duration
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

	if dataSource.CreationDate == nil {
		now := time.Now()
		dataSource.CreationDate = &now
	}

	opts := options.Replace().SetUpsert(true)

	_, err := d.database.Collection("datasources").ReplaceOne(context.Background(), filter, dataSource, opts)
	if err != nil {
		return err
	}

	return nil
}

// UpsertNotebook upserts a notebook in the "notebooks" collection
func (d *Datastore) WriteNotebook(notebook *Notebook) error {
	if notebook.CreationDate == nil {
		now := time.Now()
		notebook.CreationDate = &now
	}
	notebook.LastEdited = time.Now()
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
