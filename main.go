package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq"
)

type Result struct {
	Columns []string        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
}

type RequestBody struct {
	Query string `json:"query"`
}

var (
	connStr string = os.Getenv("POSTGRES_TEST_CONNECTION")
)

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
		for i := range columns {
			rowValues[i] = values[i]
		}

		// Append the row to the result rows
		resultRows = append(resultRows, rowValues)
	}

	if err = rows.Err(); err != nil {
		return nil, nil, err
	}

	return columns, resultRows, nil
}

func printResult(columns []string, rows [][]interface{}) {
	// Print the column names
	for _, column := range columns {
		fmt.Printf("%s\t", column)
	}
	fmt.Println()

	// Print the rows
	for _, row := range rows {
		for _, val := range row {
			fmt.Printf("%v\t", val)
		}
		fmt.Println()
	}
}

func queryHandler(w http.ResponseWriter, r *http.Request) {
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
		log.Fatal(err)
	}

	columns, rows, err := executeQuery(db, query)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(columns)
	fmt.Println(rows)

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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func main() {
	fmt.Println("starting server...")
	// PostgreSQL connection string

	// Open a connection to the database
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		panic(err)
	}

	defer db.Close()

	// Test the connection
	err = db.Ping()
	if err != nil {
		panic(err)
	}

	http.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "0.0.0")
	})

	http.HandleFunc("/query", queryHandler)
	// Start the HTTP server
	log.Fatal(http.ListenAndServe(":8080", nil))

}
